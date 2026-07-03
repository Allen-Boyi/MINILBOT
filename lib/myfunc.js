import fs from 'fs';
import axios from 'axios';
import crypto from 'crypto';
import moment from 'moment-timezone';
import { getContentType } from '@whiskeysockets/baileys';
import { createRequire } from 'module';
const require = createRequire(import.meta.url); // shim for lazy require('jimp') / require('util') calls below
// Smart message formatter
const smsg = (sock, m, hasParent) => {
    if (!m) return m;
    
    let M = {
        ...m,
        fromMe: m.key.fromMe,
        chat: m.key.remoteJid,
        sender: sock.decodeJid(m.fromMe ? sock.user.id : m.participant || m.key.participant || m.chat || ''),
        pushName: m.pushName || '',
        isGroup: m.chat?.endsWith('@g.us'),
        mentionedJid: m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    };
    
    // Message type detection
    M.mtype = getContentType(m.message);
    M.text = m.message?.conversation || 
             m.message?.extendedTextMessage?.text || 
             m.message?.imageMessage?.caption || 
             m.message?.videoMessage?.caption || '';
    
    // Quoted message handling
    if (m.message) {
        let quoted = null;
        if (m.message.extendedTextMessage?.contextInfo?.quotedMessage) {
            quoted = m.message.extendedTextMessage.contextInfo;
        }
        
        if (quoted) {
            const type = getContentType(quoted.quotedMessage);
            M.quoted = {
                ...quoted,
                type,
                fromMe: quoted.participant === sock.decodeJid(sock.user.id),
                sender: sock.decodeJid(quoted.participant),
                text: quoted.quotedMessage?.conversation ||
                      quoted.quotedMessage?.extendedTextMessage?.text ||
                      quoted.quotedMessage?.imageMessage?.caption ||
                      quoted.quotedMessage?.videoMessage?.caption || ''
            };
            
            // Download quoted media
            M.quoted.download = () => downloadMediaMessage(M.quoted, 'buffer');
        }
    }
    
    // Reply function
    M.reply = (text, options = {}) => {
        return sock.sendMessage(M.chat, { text }, { quoted: m, ...options });
    };
    
    // React function
    M.react = (emoji) => {
        return sock.sendMessage(M.chat, { react: { text: emoji, key: m.key } });
    };
    
    return M;
};

// Download media message
const downloadMediaMessage = async (message, type = 'buffer') => {
    const stream = await downloadContentFromMessage(message, type);
    let buffer = Buffer.from([]);
    
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    
    return buffer;
};

// Get group admins
const getGroupAdmins = (participants) => {
    const admins = [];
    for (let i of participants) {
        if (i.admin === 'admin' || i.admin === 'superadmin') {
            admins.push(i.id);
        }
    }
    return admins;
};

// Runtime calculator
const runtime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const dDisplay = d > 0 ? d + (d === 1 ? ' day ' : ' days ') : '';
    const hDisplay = h > 0 ? h + (h === 1 ? ' hour ' : ' hours ') : '';
    const mDisplay = m > 0 ? m + (m === 1 ? ' minute ' : ' minutes ') : '';
    const sDisplay = s > 0 ? s + (s === 1 ? ' second' : ' seconds') : '';
    
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

// Clock string formatter
const clockString = (ms) => {
    const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
    const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
    const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':');
};

// Sleep function
const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Random number generator
const getRandom = (ext = '') => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

// Format file size
const formatp = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Check if string is URL
const isUrl = (url) => {
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return urlRegex.test(url);
};

// Get buffer from URL
const getBuffer = async (url, options = {}) => {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            ...options
        });
        return Buffer.from(response.data);
    } catch (error) {
        throw new Error(`Failed to get buffer: ${error.message}`);
    }
};

// Fetch JSON from URL
const fetchJson = async (url, options = {}) => {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            ...options
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch JSON: ${error.message}`);
    }
};

// Parse mentions from text
const parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

// Generate message tag
const generateMessageTag = (epoch) => {
    const tag = (epoch || Date.now()).toString();
    return tag;
};

// Get media size
const getSizeMedia = (media) => {
    if (!media) return 0;
    return Buffer.byteLength(media);
};

// JSON formatter
const jsonformat = (obj) => {
    return JSON.stringify(obj, null, 2);
};

// Format date
const formatDate = (date, locale = 'en') => {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return new Date(date).toLocaleDateString(locale, options);
};

// Get current time
const getTime = (timezone = 'Africa/Harare') => {
    return moment().tz(timezone).format('HH:mm:ss');
};

// Get current date
const tanggal = (timezone = 'Africa/Harare') => {
    return moment().tz(timezone).format('DD/MM/YYYY');
};

// Generate profile picture
const generateProfilePicture = async (buffer) => {
    const jimp = require('jimp');
    const image = await jimp.read(buffer);
    const min = image.getWidth();
    const max = image.getHeight();
    const crop = min > max ? max : min;
    
    return {
        img: await image.crop(0, 0, crop, crop).scaleToFit(720, 720).getBufferAsync(jimp.MIME_JPEG)
    };
};

// Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Logic function for mathematical operations
const logic = (check, inp, out) => {
    if (inp.length !== out.length) throw new Error('Input and output arrays must have the same length');
    const index = inp.indexOf(check);
    return index !== -1 ? out[index] : null;
};

// Format function for text formatting
const format = (...args) => {
    return require('util').format(...args);
};

// File operations
const readFile = (path) => {
    return fs.readFileSync(path, 'utf8');
};

const writeFile = (path, data) => {
    return fs.writeFileSync(path, data);
};

const deleteFile = (path) => {
    if (fs.existsSync(path)) {
        return fs.unlinkSync(path);
    }
    return false;
};

// Database operations
const loadDatabase = () => {
    if (fs.existsSync('./database.json')) {
        return JSON.parse(fs.readFileSync('./database.json'));
    }
    return { users: {}, chats: {}, settings: {} };
};

const saveDatabase = () => {
    fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2));
};

// Color functions for console
const color = (text, color) => {
    const colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        underscore: '\x1b[4m',
        blink: '\x1b[5m',
        reverse: '\x1b[7m',
        hidden: '\x1b[8m',
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m'
    };
    return colors[color] + text + colors.reset;
};

// Export all functions
export {
    smsg,
    downloadMediaMessage,
    getGroupAdmins,
    runtime,
    clockString,
    sleep,
    getRandom,
    formatp,
    isUrl,
    getBuffer,
    fetchJson,
    parseMention,
    generateMessageTag,
    getSizeMedia,
    jsonformat,
    formatDate,
    getTime,
    tanggal,
    generateProfilePicture,
    delay,
    logic,
    format,
    readFile,
    writeFile,
    deleteFile,
    loadDatabase,
    saveDatabase,
    color
};