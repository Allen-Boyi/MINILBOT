import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { performance } from 'perf_hooks';
import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import { startBot, getSock, isBotReady } from './index.js';
import { config } from './config.js';
import {
    ensureDbShape, isGroupRegistered, registerGroup, unregisterGroup, getGroup,
    getGroupSettings, updateGroupSettings
} from './lib/groupSettings.js';
import {
    normalizePhone, getUser, upsertUser, setOtp, verifyOtp, getUserBySessionToken,
    getUserGroups, countUserGroups, tierLimits, setTier, promoteToOwner, TIERS
} from './lib/userStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || config.port; // $PORT set by host automatically; config.port is the fallback

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- OTP / Dashboard config — all values come from config.js ----------
const OTP_TTL_MS         = config.otpTtlMs;
const RESEND_COOLDOWN_MS = config.resendCooldownMs;
const OWNER_NUMBER       = config.ownerNumber.replace(/\D/g, '');

function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function otpMessage(code) {
    return (
        `🔐 *${config.botName} Verification*\n\n` +
        `Your verification code is: *${code}*\n\n` +
        `⏳ Expires in 5 minutes\n` +
        `🚫 Never share this code with anyone — not even the bot owner.`
    );
}

// Require a valid 24h session cookie. Attaches req.user.
async function requireAuth(req, res, next) {
    const token = req.cookies?.session;
    const user = getUserBySessionToken(token);
    if (!user) return res.status(401).json({ error: 'Not logged in or session expired.' });
    req.user = user;
    next();
}

function requireOwner(req, res, next) {
    if (!req.user?.isOwner) return res.status(403).json({ error: 'Owner access only.' });
    next();
}

// Store startup time
const startTime = Date.now();

// Helper functions
const getSystemInfo = () => {
    const memUsage = process.memoryUsage();
    const systemMem = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
    };
    
    return {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        systemUptime: os.uptime(),
        memory: {
            heap: {
                used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
                total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100
            },
            rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
            external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
            system: {
                total: Math.round(systemMem.total / 1024 / 1024 / 1024 * 100) / 100,
                free: Math.round(systemMem.free / 1024 / 1024 / 1024 * 100) / 100,
                used: Math.round(systemMem.used / 1024 / 1024 / 1024 * 100) / 100,
                usage: Math.round((systemMem.used / systemMem.total) * 100 * 100) / 100
            }
        },
        cpu: {
            model: os.cpus()[0].model,
            cores: os.cpus().length,
            loadAverage: os.loadavg()
        }
    };
};

const getBotStats = () => {
    try {
        const users = Object.keys(global.db?.users || {}).length;
        const chats = Object.keys(global.db?.chats || {}).length;
        const settings = global.db?.settings || {};
        
        return {
            users,
            chats,
            settings: {
                public: settings.public || false,
                autoread: settings.autoread || false,
                aimode: settings.aimode || false,
                antidelete: settings.antidelete || false,
                paused: settings.paused || false
            },
            startTime: global.startTime || startTime
        };
    } catch (error) {
        return {
            users: 0,
            chats: 0,
            settings: {},
            startTime: startTime
        };
    }
};

const formatUptime = (uptime) => {
    const seconds = Math.floor(uptime % 60);
    const minutes = Math.floor((uptime / 60) % 60);
    const hours = Math.floor((uptime / 3600) % 24);
    const days = Math.floor(uptime / 86400);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    
    return parts.join(' ') || '0s';
};

// Routes

// Root endpoint
app.get('/', (req, res) => {
    const uptime = formatUptime(process.uptime());
    const botStats = getBotStats();
    
    res.json({
        bot: 'CIARA-IV',
        version: '4.0.0',
        creator: 'CraigeeX🫟',
        status: 'online',
        uptime,
        users: botStats.users,
        chats: botStats.chats,
        timestamp: new Date().toISOString(),
        links: {
            github: 'https://github.com/CraigeeX/CIARA-IV',
            portfolio: 'https://craigeex.vercel.app',
            pairing: 'https://ciara-iv-link.onrender.com'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    const startCheck = performance.now();
    const system = getSystemInfo();
    const botStats = getBotStats();
    const endCheck = performance.now();
    
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: formatUptime(system.uptime),
        systemUptime: formatUptime(system.systemUptime),
        responseTime: Math.round((endCheck - startCheck) * 100) / 100,
        bot: {
            name: 'CIARA-IV',
            version: '4.0.0',
            users: botStats.users,
            chats: botStats.chats,
            settings: botStats.settings
        },
        system: {
            platform: system.platform,
            arch: system.arch,
            nodeVersion: system.nodeVersion,
            memory: system.memory,
            cpu: {
                cores: system.cpu.cores,
                loadAverage: system.cpu.loadAverage.map(load => Math.round(load * 100) / 100)
            }
        }
    };
    
    // Determine health status
    const memoryUsage = system.memory.system.usage;
    const loadAverage = system.cpu.loadAverage[0];
    
    if (memoryUsage > 90 || loadAverage > system.cpu.cores * 2) {
        health.status = 'warning';
    }
    
    if (memoryUsage > 95 || loadAverage > system.cpu.cores * 3) {
        health.status = 'critical';
    }
    
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'warning' ? 200 : 503;
    res.status(statusCode).json(health);
});

// Detailed status endpoint
app.get('/status', (req, res) => {
    const system = getSystemInfo();
    const botStats = getBotStats();
    
    res.json({
        bot: {
            name: 'CIARA-IV',
            version: '4.0.0',
            creator: 'CraigeeX🫟',
            status: global.db?.settings?.paused ? 'paused' : 'active',
            uptime: formatUptime(process.uptime()),
            startTime: new Date(botStats.startTime).toISOString(),
            users: botStats.users,
            chats: botStats.chats,
            commands: '50+',
            features: {
                aiMode: botStats.settings.aimode,
                autoRead: botStats.settings.autoread,
                antiDelete: botStats.settings.antidelete,
                publicMode: botStats.settings.public
            }
        },
        system: {
            platform: `${system.platform} ${system.arch}`,
            nodeVersion: system.nodeVersion,
            uptime: formatUptime(system.uptime),
            systemUptime: formatUptime(system.systemUptime),
            memory: {
                heap: `${system.memory.heap.used}MB / ${system.memory.heap.total}MB`,
                rss: `${system.memory.rss}MB`,
                system: `${system.memory.system.used}GB / ${system.memory.system.total}GB (${system.memory.system.usage}%)`
            },
            cpu: {
                model: system.cpu.model.substring(0, 50),
                cores: system.cpu.cores,
                loadAverage: system.cpu.loadAverage.map(load => Math.round(load * 100) / 100)
            }
        },
        links: {
            github: 'https://github.com/CraigeeX/CIARA-IV',
            portfolio: 'https://craigeex.vercel.app',
            pairing: 'https://ciara-iv-link.onrender.com'
        }
    });
});

// Bot information endpoint
app.get('/api/info', (req, res) => {
    const botStats = getBotStats();
    
    res.json({
        name: 'CIARA-IV',
        version: '4.0.0',
        description: 'Advanced WhatsApp Bot with AI integration',
        creator: {
            name: 'CraigeeX🫟',
            github: 'https://github.com/CraigeeX',
            portfolio: 'https://craigeex.vercel.app',
            country: 'Zimbabwe 🇿🇼',
            age: 19
        },
        statistics: {
            users: botStats.users,
            chats: botStats.chats,
            uptime: formatUptime(process.uptime()),
            commands: '50+'
        },
        features: [
            'AI-powered responses',
            'Multi-media downloads',
            'Interactive games',
            'Group management',
            'Search utilities',
            'Format conversion',
            'Mathematical tools',
            'Sticker creation'
        ],
        deployment: [
            'Heroku',
            'Render',
            'Railway',
            'VPS/Cloud',
            'Docker',
            'Kubernetes'
        ]
    });
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', (req, res) => {
    const system = getSystemInfo();
    const botStats = getBotStats();
    
    const metrics = `
# HELP ciara_iv_uptime_seconds Bot uptime in seconds
# TYPE ciara_iv_uptime_seconds counter
ciara_iv_uptime_seconds ${Math.floor(process.uptime())}

# HELP ciara_iv_users_total Total number of users
# TYPE ciara_iv_users_total gauge
ciara_iv_users_total ${botStats.users}

# HELP ciara_iv_chats_total Total number of chats
# TYPE ciara_iv_chats_total gauge
ciara_iv_chats_total ${botStats.chats}

# HELP ciara_iv_memory_usage_bytes Memory usage in bytes
# TYPE ciara_iv_memory_usage_bytes gauge
ciara_iv_memory_usage_bytes ${system.memory.heap.used * 1024 * 1024}

# HELP ciara_iv_system_memory_usage_percent System memory usage percentage
# TYPE ciara_iv_system_memory_usage_percent gauge
ciara_iv_system_memory_usage_percent ${system.memory.system.usage}

# HELP ciara_iv_cpu_load_average System load average
# TYPE ciara_iv_cpu_load_average gauge
ciara_iv_cpu_load_average{period="1m"} ${system.cpu.loadAverage[0]}
ciara_iv_cpu_load_average{period="5m"} ${system.cpu.loadAverage[1]}
ciara_iv_cpu_load_average{period="15m"} ${system.cpu.loadAverage[2]}
`.trim();
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});

// QR code endpoint
app.get('/qr', (req, res) => {
    res.json({
        message: 'QR Code generation for WhatsApp pairing',
        pairingSite: 'https://ciara-iv-link.onrender.com',
        instructions: [
            'Visit the pairing site above',
            'Enter your WhatsApp number',
            'Get the 8-digit pairing code',
            'Open WhatsApp > Settings > Linked Devices',
            'Tap "Link a Device" and enter the code'
        ],
        alternative: 'Check bot console/logs for QR code to scan'
    });
});

// Webhook endpoint for external integrations
app.post('/webhook', (req, res) => {
    const { event, data } = req.body;
    
    console.log(`📨 Webhook received: ${event}`, data);
    
    // Handle different webhook events
    switch (event) {
        case 'github_push':
            console.log('🔄 GitHub push detected, consider auto-update');
            break;
        case 'heroku_deploy':
            console.log('🚀 Heroku deployment detected');
            break;
        default:
            console.log('❓ Unknown webhook event:', event);
    }
    
    res.json({ 
        status: 'received', 
        event, 
        timestamp: new Date().toISOString() 
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'CIARA-IV API',
        version: '1.0.0',
        endpoints: {
            'GET /': 'Basic bot information',
            'GET /health': 'Health check with system metrics',
            'GET /status': 'Detailed bot and system status',
            'GET /api/info': 'Bot information and statistics',
            'GET /metrics': 'Prometheus metrics',
            'GET /qr': 'QR code pairing information',
            'POST /webhook': 'Webhook for external integrations',
            'GET /api': 'This API documentation'
        },
        documentation: 'https://github.com/CraigeeX/CIARA-IV#api-documentation',
        support: 'https://github.com/CraigeeX/CIARA-IV/issues'
    });
});

// ============ AUTH ============

app.post('/api/auth/request-otp', async (req, res) => {
    try {
        const phone = normalizePhone(req.body.phone);
        if (phone.length < 8) return res.status(400).json({ error: 'Enter a valid phone number with country code.' });

        const existing = getUser(phone);
        if (existing?.otp && Date.now() - existing.otp.lastSentAt < RESEND_COOLDOWN_MS) {
            const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.otp.lastSentAt)) / 1000);
            return res.status(429).json({ error: `Please wait ${waitSec}s before requesting another code.` });
        }

        if (!isBotReady()) return res.status(503).json({ error: 'WhatsApp bot is not connected yet. Try again shortly.' });

        const code = generateOtpCode();
        setOtp(phone, code, OTP_TTL_MS);

        const sock = getSock();
        await sock.sendMessage(`${phone}@s.whatsapp.net`, { text: otpMessage(code) });

        res.json({ success: true, message: 'OTP sent via WhatsApp.' });
    } catch (err) {
        console.error('request-otp error:', err.message);
        res.status(500).json({ error: 'Could not send OTP. Please try again shortly.' });
    }
});

app.post('/api/auth/verify-otp', (req, res) => {
    const phone = normalizePhone(req.body.phone);
    const { code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Phone and code are required.' });

    const result = verifyOtp(phone, code);
    if (!result.ok) return res.status(400).json({ error: result.error });

    // Owner number always gets owner + business tier automatically
    if (OWNER_NUMBER === phone) {
        upsertUser(phone, { isOwner: true, tier: 'business' });
    }

    // `secure: true` in prod — hosts like Render always serve HTTPS, so this is safe to hardcode
    res.cookie('session', result.sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        expires: new Date(result.sessionExpiresAt)
    });
    res.json({ success: true, message: 'Logged in.' });
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('session');
    res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    const limits = tierLimits(req.user.tier);
    res.json({
        phone: req.user.phone,
        tier: req.user.tier,
        isOwner: Boolean(req.user.isOwner),
        limits: { ...limits, maxGroups: limits.maxGroups === Infinity ? 'unlimited' : limits.maxGroups },
        groupCount: countUserGroups(req.user.phone)
    });
});

// ============ DASHBOARD: GROUPS ============

app.get('/api/groups', requireAuth, (req, res) => {
    res.json({ groups: getUserGroups(req.user.phone) });
});

// Add a group by invite link — bot joins itself, then the group is registered to this user.
app.post('/api/groups/add', requireAuth, async (req, res) => {
    try {
        const { inviteLink } = req.body;
        if (!inviteLink) return res.status(400).json({ error: 'Invite link is required.' });

        const limits = tierLimits(req.user.tier);
        if (countUserGroups(req.user.phone) >= limits.maxGroups) {
            return res.status(403).json({ error: `Your ${limits.label} plan allows up to ${limits.maxGroups === Infinity ? 'unlimited' : limits.maxGroups} group(s). Upgrade to add more.` });
        }

        const codeMatch = inviteLink.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
        if (!codeMatch) return res.status(400).json({ error: 'That doesn\'t look like a WhatsApp group invite link.' });

        if (!isBotReady()) return res.status(503).json({ error: 'WhatsApp bot is not connected yet. Try again shortly.' });
        const sock = getSock();

        const groupJid = await sock.groupAcceptInvite(codeMatch[1]);
        registerGroup(groupJid, req.user.phone);

        res.json({ success: true, groupJid });
    } catch (err) {
        console.error('groups/add error:', err.message);
        res.status(500).json({ error: 'Could not join that group. The link may be invalid or expired.' });
    }
});

app.delete('/api/groups/:jid', requireAuth, async (req, res) => {
    const group = getGroup(req.params.jid);
    if (!group || (group.ownerPhone !== req.user.phone && !req.user.isOwner)) {
        return res.status(404).json({ error: 'Group not found on your account.' });
    }
    try {
        const sock = getSock();
        if (sock) await sock.groupLeave(req.params.jid).catch(() => {});
    } finally {
        unregisterGroup(req.params.jid);
        res.json({ success: true });
    }
});

app.get('/api/groups/:jid/settings', requireAuth, (req, res) => {
    const group = getGroup(req.params.jid);
    if (!group || (group.ownerPhone !== req.user.phone && !req.user.isOwner)) {
        return res.status(404).json({ error: 'Group not found on your account.' });
    }
    res.json({ settings: group.settings });
});

app.patch('/api/groups/:jid/settings', requireAuth, (req, res) => {
    const group = getGroup(req.params.jid);
    if (!group || (group.ownerPhone !== req.user.phone && !req.user.isOwner)) {
        return res.status(404).json({ error: 'Group not found on your account.' });
    }

    const limits = tierLimits(req.user.tier);
    const patch = {};
    if ('antilink' in req.body) {
        if (!limits.antilink) return res.status(403).json({ error: 'Antilink isn\'t included in your plan.' });
        patch.antilink = req.body.antilink;
    }
    if ('antibadword' in req.body) {
        if (!limits.antibadword) return res.status(403).json({ error: 'Antibadword isn\'t included in your plan. Upgrade to Plus or higher.' });
        patch.antibadword = req.body.antibadword;
    }
    if ('welcome' in req.body) patch.welcome = Boolean(req.body.welcome);
    if ('welcomeText' in req.body) patch.welcomeText = String(req.body.welcomeText).slice(0, 500);
    if ('maxWarnings' in req.body) patch.maxWarnings = Math.max(1, Math.min(10, parseInt(req.body.maxWarnings) || 3));

    const updated = updateGroupSettings(req.params.jid, patch);
    res.json({ settings: updated });
});

// ============ OWNER ============

app.get('/api/owner/users', requireAuth, requireOwner, (req, res) => {
    const db = ensureDbShape(JSON.parse(fs.existsSync('./database.json') ? fs.readFileSync('./database.json', 'utf8') : '{}'));
    const users = Object.values(db.users).map(u => ({
        phone: u.phone, tier: u.tier, isOwner: Boolean(u.isOwner), createdAt: u.createdAt
    }));
    res.json({ users });
});

app.post('/api/owner/users/:phone/tier', requireAuth, requireOwner, (req, res) => {
    try {
        const updated = setTier(req.params.phone, req.body.tier);
        res.json({ user: updated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/owner/users/:phone/promote', requireAuth, requireOwner, (req, res) => {
    const updated = promoteToOwner(req.params.phone);
    res.json({ user: updated });
});

app.get('/api/tiers', (req, res) => {
    res.json({ tiers: TIERS });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        availableEndpoints: [
            'GET /',
            'GET /health', 
            'GET /status',
            'GET /api/info',
            'GET /metrics',
            'GET /qr',
            'POST /webhook',
            'GET /api'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong on the server',
        timestamp: new Date().toISOString()
    });
});

// Start server + bot together (this file is the single combined entrypoint)
app.listen(port, () => {
    console.log(`🌐 Web server running on port ${port}`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log(`📊 Status: http://localhost:${port}/status`);
    console.log(`📡 API docs: http://localhost:${port}/api`);
    console.log(`📈 Metrics: http://localhost:${port}/metrics`);
    
    console.log(`🌍 Public URL: Check your deployment platform dashboard`);
});

startBot().catch(err => console.error('Failed to start WhatsApp bot:', err));

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});

export default app;