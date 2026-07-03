import fs from 'fs';

const DB_PATH = './database.json';

const DEFAULT_GROUP_SETTINGS = {
    antilink: 'off',        // off | delete | kick
    antibadword: 'off',     // off | warn | delete | kick
    welcome: false,
    welcomeText: 'Welcome @user to the group! 🎉',
    rules: '',
    maxWarnings: 3
};

function readDb() {
    try {
        if (fs.existsSync(DB_PATH)) {
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        }
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

export function ensureDbShape(db) {
    db.users = db.users || {};
    db.groups = db.groups || {};
    db.settings = db.settings || {};
    return db;
}

// Is this group registered through the website (added via invite link by a paying/trial user)?
export function isGroupRegistered(groupJid) {
    const db = ensureDbShape(readDb());
    return Boolean(db.groups[groupJid]);
}

export function registerGroup(groupJid, ownerPhone) {
    const db = ensureDbShape(readDb());
    db.groups[groupJid] = {
        ownerPhone,
        addedAt: Date.now(),
        settings: { ...DEFAULT_GROUP_SETTINGS },
        warnings: {},
        banned: {},
        mutedUntil: {}
    };
    writeDb(db);
    return db.groups[groupJid];
}

export function unregisterGroup(groupJid) {
    const db = ensureDbShape(readDb());
    delete db.groups[groupJid];
    writeDb(db);
}

export function getGroup(groupJid) {
    const db = ensureDbShape(readDb());
    return db.groups[groupJid] || null;
}

export function getGroupSettings(groupJid) {
    const group = getGroup(groupJid);
    return group ? group.settings : { ...DEFAULT_GROUP_SETTINGS };
}

export function updateGroupSettings(groupJid, partialSettings) {
    const db = ensureDbShape(readDb());
    if (!db.groups[groupJid]) return null;
    db.groups[groupJid].settings = { ...db.groups[groupJid].settings, ...partialSettings };
    writeDb(db);
    return db.groups[groupJid].settings;
}

export function addWarning(groupJid, userJid) {
    const db = ensureDbShape(readDb());
    if (!db.groups[groupJid]) return 0;
    const g = db.groups[groupJid];
    g.warnings[userJid] = (g.warnings[userJid] || 0) + 1;
    writeDb(db);
    return g.warnings[userJid];
}

export function getWarnings(groupJid, userJid) {
    const group = getGroup(groupJid);
    return group?.warnings?.[userJid] || 0;
}

export function clearWarnings(groupJid, userJid) {
    const db = ensureDbShape(readDb());
    if (!db.groups[groupJid]) return;
    delete db.groups[groupJid].warnings[userJid];
    writeDb(db);
}

export function setBanned(groupJid, userJid, banned) {
    const db = ensureDbShape(readDb());
    if (!db.groups[groupJid]) return;
    if (banned) db.groups[groupJid].banned[userJid] = true;
    else delete db.groups[groupJid].banned[userJid];
    writeDb(db);
}

export function isBanned(groupJid, userJid) {
    const group = getGroup(groupJid);
    return Boolean(group?.banned?.[userJid]);
}

export function setMuted(groupJid, userJid, untilTimestamp) {
    const db = ensureDbShape(readDb());
    if (!db.groups[groupJid]) return;
    if (untilTimestamp) db.groups[groupJid].mutedUntil[userJid] = untilTimestamp;
    else delete db.groups[groupJid].mutedUntil[userJid];
    writeDb(db);
}

export function isMuted(groupJid, userJid) {
    const group = getGroup(groupJid);
    const until = group?.mutedUntil?.[userJid];
    if (!until) return false;
    if (Date.now() > until) return false; // expired
    return true;
}

// Very small starter bad-word list — replace/extend in the dashboard or here.
const DEFAULT_BAD_WORDS = ['badword1', 'badword2'];

export function containsBadWord(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return DEFAULT_BAD_WORDS.some(w => lower.includes(w));
}

const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com)/i;
export function containsLink(text) {
    if (!text) return false;
    return LINK_REGEX.test(text);
}
