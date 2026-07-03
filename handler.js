import fs from 'fs';
import chalk from 'chalk';
import moment from 'moment-timezone';
import { getContentType, jidNormalizedUser } from '@whiskeysockets/baileys';
import { smsg, getGroupAdmins, formatp, tanggal, formatDate, getTime, isUrl, sleep, clockString, runtime, fetchJson, getBuffer, jsonformat, delay, format, logic, generateProfilePicture, parseMention, getRandom } from './lib/myfunc.js';
import { isGroupRegistered, getGroupSettings, addWarning, containsBadWord, containsLink, isMuted } from './lib/groupSettings.js';
import { config } from './config.js';

// Load all command files.
// NOTE: command files export EITHER a single command object, OR (more commonly)
// several named command objects (e.g. `export const kick = {...}; export const ban = {...};`).
// Either way, requiring/importing the file gives us an object whose values are the
// individual command definitions — so we scan Object.values() rather than assuming
// a single top-level {name, execute} shape.
const commands = new Map();
const loadCommands = async () => {
    const commandFolders = fs.readdirSync('./commands');
    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const mod = await import(`./commands/${folder}/${file}`);
            const exported = mod.default ?? mod;
            const candidates = Object.values(exported);
            for (const cmd of candidates) {
                if (cmd && typeof cmd === 'object' && cmd.name && typeof cmd.execute === 'function') {
                    commands.set(cmd.name, cmd);
                    if (cmd.aliases) {
                        cmd.aliases.forEach(alias => commands.set(alias, cmd));
                    }
                }
            }
        }
    }
    console.log(chalk.green(`✅ Loaded ${commands.size} commands`));
};

await loadCommands();

export default async (sock, m, chatUpdate) => {
    try {
        const body = (m.mtype === 'conversation') ? m.message.conversation : 
                   (m.mtype === 'imageMessage') ? m.message.imageMessage.caption : 
                   (m.mtype === 'videoMessage') ? m.message.videoMessage.caption : 
                   (m.mtype === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                   (m.mtype === 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : 
                   (m.mtype === 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : 
                   (m.mtype === 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : 
                   (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : '';

        const budy = (typeof m.text === 'string' ? m.text : '');
        const prefix = /^[\\/!#.]/gi.test(body) ? body.match(/^[\\/!#.]/gi)[0] : config.prefix;
        const isCmd = body.startsWith(prefix);
        const command = body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase();
        const args = body.trim().split(/ +/).slice(1);
        const pushname = m.pushName || "No Name";
        const botNumber = await sock.decodeJid(sock.user.id);
        const isOwner = config.ownerNumber.replace(/\D/g, '') === m.sender.replace(/\D/g, '');
        const itsMe = m.sender == botNumber ? true : false;
        const text = args.join(" ");
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';
        const isMedia = /image|video|sticker|audio/.test(mime);
        
        // Group info
        const isGroup = m.chat.endsWith('@g.us');
        const groupMetadata = isGroup ? await sock.groupMetadata(m.chat).catch(e => {}) : '';
        const groupName = !isGroup ? '' : groupMetadata.subject;
        const participants = !isGroup ? '' : groupMetadata.participants;
        const groupAdmins = !isGroup ? '' : getGroupAdmins(participants);
        const isBotAdmins = !isGroup ? false : groupAdmins.includes(botNumber);
        const isAdmins = !isGroup ? false : groupAdmins.includes(m.sender);

        // group.js commands read these straight off `m` rather than the options object,
        // so they need to be attached here, not just passed separately below.
        m.isAdmins = isAdmins;
        m.isBotAdmins = isBotAdmins;
        m.groupAdmins = isGroup ? groupAdmins : [];
        m.groupMetadata = groupMetadata;

        // Moderation: antilink / antibadword / mute — runs on every group message,
        // skips admins and the bot owner so mods can still post freely.
        if (isGroup && isGroupRegistered(m.chat) && !isAdmins && !isOwner && budy) {
            const gSettings = getGroupSettings(m.chat);

            if (isMuted(m.chat, m.sender)) {
                try { await sock.sendMessage(m.chat, { delete: m.key }); } catch (e) {}
                return;
            }

            if (gSettings.antilink !== 'off' && containsLink(budy)) {
                try { await sock.sendMessage(m.chat, { delete: m.key }); } catch (e) {}
                if (gSettings.antilink === 'kick' && isBotAdmins) {
                    await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove').catch(() => {});
                    await sock.sendMessage(m.chat, { text: `🔗 @${m.sender.split('@')[0]} was removed for posting a link.`, mentions: [m.sender] });
                } else {
                    await sock.sendMessage(m.chat, { text: `🔗 Links aren't allowed here, @${m.sender.split('@')[0]}.`, mentions: [m.sender] });
                }
                return;
            }

            if (gSettings.antibadword !== 'off' && containsBadWord(budy)) {
                if (gSettings.antibadword === 'delete' || gSettings.antibadword === 'kick') {
                    try { await sock.sendMessage(m.chat, { delete: m.key }); } catch (e) {}
                }
                if (gSettings.antibadword === 'kick' && isBotAdmins) {
                    await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove').catch(() => {});
                    await sock.sendMessage(m.chat, { text: `🤬 @${m.sender.split('@')[0]} was removed for inappropriate language.`, mentions: [m.sender] });
                    return;
                }
                if (gSettings.antibadword === 'warn') {
                    const count = addWarning(m.chat, m.sender);
                    await sock.sendMessage(m.chat, { text: `🤬 @${m.sender.split('@')[0]}, please watch your language. (${count}/${gSettings.maxWarnings || 3})`, mentions: [m.sender] });
                }
                return;
            }
        }

        // Database
        if (!global.db.users[m.sender]) {
            global.db.users[m.sender] = {
                name: pushname,
                premium: false,
                limit: 100,
                exp: 0,
                level: 1,
                warn: 0,
                banned: false,
                joindate: Date.now()
            };
        }
        
        if (isGroup && !global.db.chats[m.chat]) {
            global.db.chats[m.chat] = {
                name: groupName,
                welcome: false,
                bye: false,
                mute: false,
                antilink: false,
                antidelete: false,
                members: participants.length
            };
        }

        // Menu system
        if (isCmd && command === 'menu') {
            const ramUsage = process.memoryUsage().rss / 1024 / 1024;
            const uptime = runtime(process.uptime());
            
            const menuText = `HELLO ${pushname} ✨

┏〔 ⚙ COMMANDS PANEL 〕━┓
┃ RAM USAGE : ${ramUsage.toFixed(2)} MB
┃ RUNTIME   : ${uptime}
┗━━━━━━━━━━━━━━●●

┏━━〔 📑 LIST MENU 〕━━┓
┃ 1  OWNER
┃ 2  MAIN  
┃ 3  DOWNLOAD
┃ 4  SEARCH
┃ 5  AI
┃ 6  CONVERT
┃ 7  MATHTOOL
┃ 8  GROUP
┃ 9  STICKER
┃ 10 GAME
┗━━━━━━━━━━━━●●●●

💡 Reply the *Number* to view commands`;

            await sock.sendMessage(m.chat, {
                image: { url: config.botImage },
                caption: menuText
            }, { quoted: m });
            return;
        }

        // List command
        if (isCmd && command === 'list') {
            const listText = `HI ${pushname} ✨

*🅲︎🅸︎🅰︎🆁︎🅰︎-🅸︎🆅︎🫟*

1️⃣ *OWNER*
.addowner
.removeowner
.broadcastgroup
.setprefix
.updateplugin
.pluginlist
.autoupdate
.eval
.botlog
.tempban

2️⃣ *MAIN*
.userinfo
.botinfo
.uptime
.feedback
.ping
.serverstatus
.remindme

3️⃣ *DOWNLOAD*
.song
.video
.tiktok
.instagram
.facebook
.spotify
.apk
.multidl

4️⃣ *SEARCH*
.google
.gimage
.wiki
.define
.weather
.trendnews
.nearby

5️⃣ *AI*
.chatgpt
.imagine
.summary
.story
.poem
.aiquiz
.voiceai

6️⃣ *CONVERT*
.toaudio
.tomp3
.img2pdf
.pdf2img
.audio2text
.text2audio
.vid2gif
.img2url

7️⃣ *MATHTOOL*
.calc
.derivative
.integral
.factor
.matrix
.stats
.convertunit
.probability

8️⃣ *GROUP*
.add
.kick
.promote
.vcf
.tagall
.setwelcome
.setbye
.mute / .unmute
.groupstats
.reactionrole

9️⃣ *STICKER*
.sticker
.attp
.emojimix
.sfull
.toimg
.stickermeme
.stickerpack

🔟 *GAME*
.trivia
.hangman
.dice
.coinflip
.tictactoe
.slot
.quiz
.mathgame
.memorygame

💡 Type the *CIARA-IV* to use command`;

            await sock.sendMessage(m.chat, { text: listText }, { quoted: m });
            return;
        }

        // Number selection for menu
        if (!isCmd && /^[1-9]|10$/.test(body) && m.quoted?.fromMe) {
            const menuNumber = parseInt(body);
            let menuResponse = '';
            
            switch(menuNumber) {
                case 1:
                    menuResponse = `1️⃣ *OWNER COMMANDS*

• .buttonmode on/off - Toggle button mode
• .join [group] - Join group
• .exit - Exit group  
• .view once - View once messages
• .save status - Save status
• .autoview status - Auto view status
• .status react on/off - Toggle status reactions
• .warn [user] - Warn user
• .ai chatbot on/off - Toggle AI chatbot
• .anti delete on/off - Toggle anti delete
• .pause bot - Pause bot
• .activate bot - Activate bot

🔒 *Owner only commands*`;
                    break;
                case 2:
                    menuResponse = `2️⃣ *MAIN COMMANDS*

• .repository - Get repo link
• .pairbot - Get pairing link
• .owner - Get owner info
• .uptime - Bot uptime
• .ping - Check ping
• .botinfo - Bot information

📱 *Basic bot functions*`;
                    break;
                case 3:
                    menuResponse = `3️⃣ *DOWNLOAD COMMANDS*

• .pintrest [url] - Download Pinterest
• .twitterx [url] - Download Twitter/X
• .mediafire [url] - Download from MediaFire
• .ytvideo [url] - Download YouTube video
• .xvideo [url] - Download X video
• .play [song] - Play/Download music
• .song [name] - Download song
• .video [name] - Download video

📥 *Media downloader*`;
                    break;
                case 4:
                    menuResponse = `4️⃣ *SEARCH COMMANDS*

• .image [query] - Search images
• .yts [query] - YouTube search
• .google [query] - Google search
• .weather [city] - Weather info

🔍 *Search utilities*`;
                    break;
                case 8:
                    menuResponse = `8️⃣ *GROUP COMMANDS*

• .hidetag [text] - Hidden tag message
• .owner react - Owner reaction
• .limit - Check limits
• .exit - Exit group
• .pin msg - Pin message

👥 *Group management*`;
                    break;
                default:
                    menuResponse = `Menu section ${menuNumber} coming soon! 🚧`;
            }
            
            await sock.sendMessage(m.chat, { text: menuResponse }, { quoted: m });
            return;
        }

        // Special hidden commands
        if (isCmd && isOwner) {
            switch(command) {
                case 'buttonmode':
                    const mode = args[0]?.toLowerCase();
                    if (mode === 'on') {
                        global.db.settings.buttonmode = true;
                        m.reply('✅ Button mode activated');
                    } else if (mode === 'off') {
                        global.db.settings.buttonmode = false;
                        m.reply('❌ Button mode deactivated');
                    } else {
                        m.reply('Usage: .buttonmode on/off');
                    }
                    return;
                    
                case 'ciara_info':
                    const infoText = `*🅲︎🅸︎🅰︎🆁︎🅰︎-🅸︎🆅︎ BOT INFO* 🫟

👨‍💻 *Creator:* CraigeeX
📱 *Contact:* +27847826044
🌍 *From:* Zimbabwe 🇿🇼
🎂 *Age:* 19 years old
💻 *Role:* Tech Hub Developer
🌐 *Portfolio:* craigeex.vercel.app
📂 *GitHub:* github.com/CraigeeX

*About CraigeeX:*
A passionate 19-year-old tech enthusiast from Zimbabwe who loves creating innovative solutions and WhatsApp bots. Specialized in Node.js, JavaScript, and bot development.

🤖 *Bot Version:* CIARA-IV v4.0.0
⚡ *Features:* Advanced AI, Multi-platform support, Rich media handling`;
                    
                    await sock.sendMessage(m.chat, {
                        image: { url: config.botImage },
                        caption: infoText
                    }, { quoted: m });
                    return;
            }
        }

        // Regular commands
        if (isCmd) {
            const cmd = commands.get(command);
            if (cmd) {
                try {
                    await cmd.execute(sock, m, args, {
                        isOwner,
                        isGroup,
                        isAdmins,
                        isBotAdmins,
                        pushname,
                        text,
                        quoted,
                        mime,
                        isMedia,
                        groupMetadata,
                        participants,
                        groupAdmins
                    });
                } catch (error) {
                    console.error(chalk.red('Command error:'), error);
                    m.reply(`❌ Error executing command: ${error.message}`);
                }
            }
        }

        // AI Auto-reply
        if (global.db.settings.aimode && !isCmd && !m.fromMe) {
            if (body.toLowerCase().includes('ciara') || m.mentionedJid?.includes(botNumber)) {
                try {
                    // This is where you'll integrate with ChatGPT API
                    const aiResponse = await getChatGPTResponse(body);
                    await sock.sendMessage(m.chat, { text: aiResponse }, { quoted: m });
                } catch (error) {
                    console.error('AI Error:', error);
                }
            }
        }

    } catch (err) {
        console.error(chalk.red('Handler error:'), err);
    }
};

// Placeholder for ChatGPT integration
async function getChatGPTResponse(message) {
    // TODO: Integrate with OpenAI API
    // You'll need to add your OpenAI API key here
    const responses = [
        "I'm CIARA-IV, created by CraigeeX! How can I help you today?",
        "Hello! I'm an AI assistant. My creator CraigeeX is a 19-year-old tech enthusiast from Zimbabwe 🇿🇼",
        "Hi there! You can check out my creator's portfolio at craigeex.vercel.app",
        "Greetings! I'm here to assist you. Feel free to ask me anything!"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}