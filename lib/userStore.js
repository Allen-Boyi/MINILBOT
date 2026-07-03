import fs from 'fs';
import crypto from 'crypto';
import { config } from './config.js';

const DB_PATH = './database.json';

export const TIERS = config.tiers;

function readDb() {
    try {
        if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
        console.error('Failed to read database.json:', e.message);
    }
    return {};
}

function writeDb(db) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error('Failed to write database.json:', e.message);
    }
}

function shape(db) {
    db.users = db.users || {};
    db.groups = db.groups || {};
    return db;
}

export function normalizePhone(raw) {
    return String(raw || '').replace(/[^0-9]/g, '');
}

export function getUser(phone) {
    const db = shape(readDb());
    return db.users[phone] || null;
}

export function upsertUser(phone, patch = {}) {
    const db = shape(readDb());
    const existing = db.users[phone] || {
        phone,
        tier: 'free',
        isOwner: false,
        createdAt: Date.now()
    };
    db.users[phone] = { ...existing, ...patch };
    writeDb(db);
    return db.users[phone];
}

export function setOtp(phone, code, ttlMs) {
    return upsertUser(phone, {
        otp: { code, expiresAt: Date.now() + ttlMs, attempts: 0, lastSentAt: Date.now() }
    });
}

export function verifyOtp(phone, code) {
    const user = getUser(phone);
    if (!user || !user.otp) return { ok: false, error: 'No code requested for this number.' };
    if (Date.now() > user.otp.expiresAt) return { ok: false, error: 'Code expired. Please request a new one.' };
    if (user.otp.attempts >= 5) return { ok: false, error: 'Too many attempts. Please request a new code.' };

    upsertUser(phone, { otp: { ...user.otp, attempts: user.otp.attempts + 1 } });

    if (user.otp.code !== String(code).trim()) {
        return { ok: false, error: 'Incorrect code.' };
    }

    const sessionToken = crypto.randomBytes(24).toString('hex');
    const sessionExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h
    upsertUser(phone, { otp: null, sessionToken, sessionExpiresAt });
    return { ok: true, sessionToken, sessionExpiresAt };
}

export function getUserBySessionToken(token) {
    if (!token) return null;
    const db = shape(readDb());
    const user = Object.values(db.users).find(u => u.sessionToken === token);
    if (!user) return null;
    if (Date.now() > user.sessionExpiresAt) return null;
    return user;
}

export function getUserGroups(phone) {
    const db = shape(readDb());
    return Object.entries(db.groups)
        .filter(([, g]) => g.ownerPhone === phone)
        .map(([jid, g]) => ({ jid, ...g }));
}

export function countUserGroups(phone) {
    return getUserGroups(phone).length;
}

export function tierLimits(tierName) {
    return TIERS[tierName] || TIERS.free;
}

export function setTier(phone, tierName) {
    if (!TIERS[tierName]) throw new Error('Unknown tier: ' + tierName);
    return upsertUser(phone, { tier: tierName });
}

export function promoteToOwner(phone) {
    return upsertUser(phone, { isOwner: true });
}
