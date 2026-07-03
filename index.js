import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers,
    delay,
    generateWAMessageFromContent,
    proto,
    prepareWAMessageMedia
} from '@whiskeysockets/baileys';

import { Boom } from '@hapi/boom';
import fs from 'fs';
import chalk from 'chalk';
import figlet from 'figlet';
import _ from 'lodash';
import moment from 'moment-timezone';
import PhoneNumber from 'awesome-phonenumber';
import pino from 'pino';
import { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep, getGroupAdmins } from './lib/myfunc.js';
import handler from './handler.js';
import { isGroupRegistered, registerGroup, isBanned } from './lib/groupSettings.js';
import { config } from './config.js';

// Global variables
global.db = {
    users: {},
    chats: {},
    settings: {
        autoread:    true,   // edit in config.js → botSettings
        autobio:     false,
        autoTyping:  false,
        autoRecord:  false,
        public:      true,
        antidelete:  false,
        buttonmode:  false,
        aimode:      false,
        autoview:    false,
        statusreact: false,
        viewonce:    false,
        paused:      false,
        prefix: config.prefix
    }
};

// Load database
const loadDatabase = () => {
    try {
        if (fs.existsSync('./database.json')) {
            const data = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
            global.db = { ...global.db, ...data };
            console.log(chalk.green('✅ Database loaded successfully'));
        }
    } catch (error) {
        console.log(chalk.yellow('⚠️ Could not load database, using defaults'));
    }
};

// Save database
const saveDatabase = () => {
    try {
        fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
    } catch (error) {
        console.log(chalk.red('❌ Could not save database'));
    }
};

// Auto-save database every 30 seconds
setInterval(saveDatabase, 30000);

// Module-level socket reference so the web dashboard (server.js) can
// send OTPs, join groups by invite link, etc. against the live connection.
let sock = null;
let botReady = false;

export function getSock() {
    return sock;
}
export function isBotReady() {
    return botReady;
}

global.owner = [config.ownerNumber];
global.premium = [config.ownerNumber];
global.mods = [];

// Store for runtime calculation
global.startTime = Date.now();

async function startBot() {
    // Load database first
    loadDatabase();
    
    console.clear();
    console.log(chalk.cyan(figlet.textSync('CIARA-IV', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    })));
    
    console.log(chalk.yellow(`\n🤖 Starting ${config.botName}...`));
    console.log(chalk.cyan(`👨‍💻 Created by: ${config.ownerName}`));
    console.log(chalk.magenta(`🔗 GitHub: github.com/${config.githubUsername}`));
    console.log(chalk.green(`🌐 Portfolio: craigeex.vercel.app`));
    console.log(chalk.blue(`📱 Pairing: ciara-iv-link.onrender.com`));
    console.log(chalk.white(`⚡ Version: 4.0.0`));
    console.log(chalk.gray('━'.repeat(50)));
    
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const connectionOptions = {
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: Browsers.macOS('Desktop'),
        auth: {
            creds: state.creds,
            keys: state.keys,
        },
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            return { conversation: 'Hello' }
        },
        markOnlineOnConnect: true,
        syncFullHistory: false
    };
    
    sock = makeWASocket(connectionOptions);
    
    // Pairing code setup
    if (config.pairing && !sock.authState.creds.registered) {
        console.log(chalk.yellow('📱 Pairing mode enabled'));
        console.log(chalk.cyan('🔗 Visit: ciara-iv-link.onrender.com for pairing'));
        
        // You can uncomment this for phone number pairing
        /*
        setTimeout(async () => {
            const phoneNumber = config.ownerNumber; // Replace with actual phone number
            if (phoneNumber) {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(chalk.green(`🔐 Pairing Code: ${code}`));
            }
        }, 3000);
        */
    }
    
    // Connection handler
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr, receivedPendingNotifications } = update;
        
        if (qr) {
            console.log(chalk.yellow('📱 Scan QR code above or use pairing site'));
        }
        
        if (connection === 'close') {
            botReady = false;
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            
            console.log(chalk.red('🔌 Connection closed:'), lastDisconnect?.error);
            
            if (shouldReconnect) {
                console.log(chalk.yellow('🔄 Reconnecting...'));
                setTimeout(startBot, 5000);
            } else {
                console.log(chalk.red('❌ Logged out. Please delete session folder and restart.'));
                process.exit(1);
            }
        } else if (connection === 'open') {
            botReady = true;
            console.log(chalk.green('✅ Bot connected successfully!'));
            console.log(chalk.blue(`🕐 Started at: ${new Date().toLocaleString()}`));
            console.log(chalk.blue(`🌐 Health check: http://localhost:${config.port}/health`));
            console.log(chalk.green('🚀 CIARA-IV is ready to serve!'));
            console.log(chalk.gray('━'.repeat(50)));
            
            // Send startup message to owner
            setTimeout(async () => {
                try {
                    const ownerJid = config.ownerNumber + '@s.whatsapp.net';
                    const startupMessage = `*🤖 CIARA-IV ONLINE* ✅\n\n🕐 *Started:* ${new Date().toLocaleString()}\n📊 *Status:* All systems operational\n🌐 *Health:* http://localhost:${config.port}/health\n\n💡 *Ready to serve!*`;
                    
                    await sock.sendMessage(ownerJid, { 
                        text: startupMessage 
                    });
                } catch (error) {
                    // Owner notification failed, continue silently
                }
            }, 5000);
        }
        
        if (receivedPendingNotifications) {
            console.log(chalk.blue('📨 Received pending notifications'));
        }
    });
    
    // Save credentials
    sock.ev.on('creds.update', saveCreds);

    // Group membership events
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const botJid = jidNormalizedUser(sock.user.id);
            const { id: groupJid, participants, action, author } = update;

            // Bot itself was added to a group
            if (action === 'add' && participants.includes(botJid)) {
                if (!isGroupRegistered(groupJid)) {
                    // Not added through the website's "add via link" flow — reject it.
                    try {
                        await sock.sendMessage(groupJid, {
                            text: `👋 Hi! I only work in groups added through the dashboard.\n\nTo use me here, add this group's invite link from your account at the website instead of adding me directly. Leaving now.`
                        });
                        if (author) {
                            await sock.sendMessage(author, {
                                text: `⚠️ I was added to a group ("${groupJid}") that wasn't registered through the dashboard, so I left it automatically.\n\nTo use me in a group, paste the group's invite link into your dashboard and I'll join myself.`
                            });
                        }
                    } catch (e) {}
                    await delay(1000);
                    await sock.groupLeave(groupJid).catch(() => {});
                }
                return;
            }

            // Regular member joins — enforce bans
            if (action === 'add' && isGroupRegistered(groupJid)) {
                for (const jid of participants) {
                    if (jid !== botJid && isBanned(groupJid, jid)) {
                        await sock.groupParticipantsUpdate(groupJid, [jid], 'remove').catch(() => {});
                    }
                }
            }
        } catch (error) {
            console.log(chalk.red('group-participants.update error:'), error);
        }
    });
    
    // Message handler
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            
            // Skip if bot is paused (except for owner)
            if (global.db.settings.paused) {
                const isOwner = global.owner.includes(mek.key.participant?.replace('@s.whatsapp.net', '') || mek.key.remoteJid?.replace('@s.whatsapp.net', ''));
                if (!isOwner) return;
            }
            
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
            
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                // Status message handling
                if (global.db.settings.autoview) {
                    await sock.readMessages([mek.key]);
                }
                
                if (global.db.settings.statusreact) {
                    const reactions = ['❤️', '👍', '😍', '🔥', '💯', '🎉', '✨', '😊'];
                    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
                    
                    try {
                        await sock.sendMessage(mek.key.remoteJid, {
                            react: { text: randomReaction, key: mek.key }
                        });
                    } catch (error) {
                        // React failed, continue
                    }
                }
                return;
            }
            
            if (!mek.message) return;
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
            
            const m = smsg(sock, mek);
            
            // Anti-delete feature
            if (global.db.settings.antidelete) {
                if (m.mtype === 'protocolMessage') {
                    if (m.message.protocolMessage.type === 0) {
                        const deletedMessage = store.messages[m.chat]?.array?.find(msg => 
                            msg.key.id === m.message.protocolMessage.key.id
                        );
                        
                        if (deletedMessage) {
                            let deletedText = '*🛡️ ANTI-DELETE DETECTED*\n\n';
                            deletedText += `👤 *Deleted by:* @${m.message.protocolMessage.key.participant?.split('@')[0] || 'Unknown'}\n`;
                            deletedText += `🕐 *Time:* ${new Date().toLocaleString()}\n`;
                            deletedText += `💬 *Message:* ${deletedMessage.message?.conversation || 'Media message'}\n\n`;
                            deletedText += `_Message automatically saved by CIARA-IV_`;
                            
                            await sock.sendMessage(m.chat, {
                                text: deletedText,
                                mentions: [m.message.protocolMessage.key.participant]
                            });
                        }
                    }
                }
            }
            
            // Load message handler
            await handler(sock, m, chatUpdate);
            
        } catch (err) {
            console.log(chalk.red('❌ Error in message handler:'), err);
        }
    });
    
    // Auto-read messages
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        if (global.db.settings.autoread) {
            for (const msg of chatUpdate.messages) {
                if (msg.key.remoteJid !== 'status@broadcast') {
                    await sock.readMessages([msg.key]);
                }
            }
        }
    });
    
    // Group participants update
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            
            // Get group metadata
            const groupMetadata = await sock.groupMetadata(id);
            const groupName = groupMetadata.subject;
            
            // Check if welcome/goodbye is enabled for this group
            const groupSettings = global.db.chats[id];
            if (!groupSettings) return;
            
            for (const participant of participants) {
                if (action === 'add' && groupSettings.welcome) {
                    const welcomeMessage = groupSettings.welcomeText || 
                        `*👋 WELCOME TO ${groupName}*\n\nHello @${participant.split('@')[0]}!\n\nEnjoy your stay and follow the group rules! 🎉`;
                    
                    await sock.sendMessage(id, {
                        text: welcomeMessage,
                        mentions: [participant]
                    });
                } else if (action === 'remove' && groupSettings.bye) {
                    const byeMessage = groupSettings.byeText || 
                        `*👋 GOODBYE*\n\n@${participant.split('@')[0]} left the group.\n\nWe'll miss you! 💔`;
                    
                    await sock.sendMessage(id, {
                        text: byeMessage,
                        mentions: [participant]
                    });
                }
            }
        } catch (error) {
            console.log(chalk.red('❌ Error in group update:'), error);
        }
    });
    
    // Store messages for anti-delete
    global.store = {};
    sock.ev.on('messages.upsert', (chatUpdate) => {
        for (const msg of chatUpdate.messages) {
            if (!global.store[msg.key.remoteJid]) {
                global.store[msg.key.remoteJid] = { messages: [] };
            }
            global.store[msg.key.remoteJid].messages.push(msg);
            
            // Keep only last 100 messages per chat
            if (global.store[msg.key.remoteJid].messages.length > 100) {
                global.store[msg.key.remoteJid].messages.shift();
            }
        }
    });
    
    return sock;
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.log(chalk.red('🚫 Uncaught Exception:'), err);
    saveDatabase();
});

process.on('unhandledRejection', (reason, promise) => {
    console.log(chalk.red('🚫 Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
    saveDatabase();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n⏹️ Shutting down gracefully...'));
    saveDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n⏹️ Terminating...'));
    saveDatabase();
    process.exit(0);
});

// Start the bot
console.log(chalk.blue('🚀 Initializing CIARA-IV...'));
startBot().catch(err => {
    console.log(chalk.red('❌ Error starting bot:'), err);
    process.exit(1);
});

// Export for testing
export { startBot, config };