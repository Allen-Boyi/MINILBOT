// commands/group/group.js - Group Management Commands
import {
    getGroupSettings, updateGroupSettings, addWarning, getWarnings, clearWarnings,
    setBanned, setMuted
} from '../../lib/groupSettings.js';

// Hide tag command
export const hidetag = {
    name: 'hidetag',
    aliases: ['ht', 'tag'],
    category: 'group',
    description: 'Send message with hidden mention to all members',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        
        try {
            const text = args.join(' ') || 'Hidden tag message';
            const participants = m.groupMetadata.participants.map(p => p.id);
            
            await sock.sendMessage(m.chat, {
                text: text,
                mentions: participants
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to send hidden tag message.');
        }
    }
};

// Tag all members
export const tagall = {
    name: 'tagall',
    aliases: ['mentionall', 'all'],
    category: 'group',
    description: 'Tag all group members',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        
        try {
            const participants = m.groupMetadata.participants;
            const message = args.join(' ') || 'Tagging all members';
            
            let tagText = `*📢 ${message}*\n\n`;
            participants.forEach((participant, index) => {
                tagText += `${index + 1}. @${participant.id.split('@')[0]}\n`;
            });
            
            await sock.sendMessage(m.chat, {
                text: tagText,
                mentions: participants.map(p => p.id)
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to tag all members.');
        }
    }
};

// Add member
export const add = {
    name: 'add',
    category: 'group',
    description: 'Add member to group',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.isBotAdmins) return m.reply('❌ Bot needs to be admin to add members!');
        
        if (!args[0]) return m.reply('❌ Please provide a phone number!\n\nExample: .add 1234567890');
        
        try {
            const number = args[0].replace(/\D/g, '');
            if (number.length < 7) return m.reply('❌ Invalid phone number!');
            
            const targetId = number + '@s.whatsapp.net';
            
            const response = await sock.groupParticipantsUpdate(m.chat, [targetId], 'add');
            
            if (response[0].status === 'success') {
                m.reply(`✅ Successfully added +${number} to the group!`);
            } else {
                m.reply(`❌ Failed to add +${number}. They may have privacy settings preventing this.`);
            }
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to add member. Please check the number and try again.');
        }
    }
};

// Kick member
export const kick = {
    name: 'kick',
    aliases: ['remove'],
    category: 'group',
    description: 'Remove member from group',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.isBotAdmins) return m.reply('❌ Bot needs to be admin to remove members!');
        
        if (!m.mentionedJid || !m.mentionedJid[0]) {
            return m.reply('❌ Please mention a user to kick!\n\nExample: .kick @user');
        }
        
        try {
            const target = m.mentionedJid[0];
            
            // Check if target is admin
            const targetIsAdmin = m.groupAdmins.includes(target);
            if (targetIsAdmin) return m.reply('❌ Cannot kick another admin!');
            
            const response = await sock.groupParticipantsUpdate(m.chat, [target], 'remove');
            
            if (response[0].status === 'success') {
                m.reply(`✅ Successfully removed @${target.split('@')[0]} from the group!`);
            } else {
                m.reply('❌ Failed to remove member.');
            }
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to kick member.');
        }
    }
};

// Promote member
export const promote = {
    name: 'promote',
    category: 'group',
    description: 'Promote member to admin',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.isBotAdmins) return m.reply('❌ Bot needs to be admin to promote members!');
        
        if (!m.mentionedJid || !m.mentionedJid[0]) {
            return m.reply('❌ Please mention a user to promote!\n\nExample: .promote @user');
        }
        
        try {
            const target = m.mentionedJid[0];
            
            // Check if already admin
            if (m.groupAdmins.includes(target)) {
                return m.reply('❌ User is already an admin!');
            }
            
            const response = await sock.groupParticipantsUpdate(m.chat, [target], 'promote');
            
            if (response[0].status === 'success') {
                m.reply(`✅ Successfully promoted @${target.split('@')[0]} to admin!`);
            } else {
                m.reply('❌ Failed to promote member.');
            }
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to promote member.');
        }
    }
};

// Pin message
export const pin = {
    name: 'pin',
    category: 'group',
    description: 'Pin a message',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        
        if (!m.quoted) return m.reply('❌ Please reply to a message to pin it!');
        
        try {
            await sock.sendMessage(m.chat, {
                text: '📌 Message pinned by admin',
                contextInfo: {
                    isForwarded: true,
                    forwardingScore: 1,
                    quotedMessage: m.quoted.message
                }
            });
            
            m.reply('✅ Message pinned successfully!');
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to pin message.');
        }
    }
};

---
// commands/sticker/sticker.js - Sticker Commands

import { Sticker, createSticker, StickerTypes } from 'wa-sticker-formatter';
import { getBuffer } from '../../lib/myfunc.js';
// Create sticker
export const sticker = {
    name: 'sticker',
    aliases: ['s', 'stiker'],
    category: 'sticker',
    description: 'Convert image/video to sticker',
    execute: async (sock, m, args) => {
        const quoted = m.quoted || m;
        const mime = (quoted.msg || quoted).mimetype || '';
        
        if (!mime || !(/image|video/.test(mime))) {
            return m.reply('❌ Please reply to an image or video!\n\n📝 Supported formats: JPG, PNG, MP4, GIF');
        }
        
        try {
            m.reply('🎨 Converting to sticker...');
            
            const media = await sock.downloadMediaMessage(quoted);
            
            const sticker = new Sticker(media, {
                pack: 'CIARA-IV',
                author: 'CraigeeX🫟',
                type: StickerTypes.FULL,
                categories: ['🤖', '✨'],
                id: '12345',
                quality: 50,
                background: 'transparent'
            });
            
            const stickerBuffer = await sticker.toBuffer();
            
            await sock.sendMessage(m.chat, {
                sticker: stickerBuffer
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to create sticker. Please try with a different image/video.');
        }
    }
};

// Text to sticker
export const attp = {
    name: 'attp',
    aliases: ['textsticker'],
    category: 'sticker',
    description: 'Convert text to animated sticker',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide text!\n\nExample: .attp Hello World');
        
        try {
            const text = args.join(' ');
            m.reply('🎨 Creating text sticker...');
            
            // TODO: Implement actual ATTP API
            const stickerUrl = `https://api.xteam.xyz/attp?file&text=${encodeURIComponent(text)}`;
            
            const stickerBuffer = await getBuffer(stickerUrl);
            
            await sock.sendMessage(m.chat, {
                sticker: stickerBuffer
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to create text sticker.');
        }
    }
};

// Emoji mix
export const emojimix = {
    name: 'emojimix',
    aliases: ['mix'],
    category: 'sticker',
    description: 'Mix two emojis',
    execute: async (sock, m, args) => {
        if (!args[0] || !args[1]) {
            return m.reply('❌ Please provide two emojis!\n\nExample: .emojimix 😀 😭');
        }
        
        try {
            const emoji1 = args[0];
            const emoji2 = args[1];
            
            m.reply('🎨 Mixing emojis...');
            
            // TODO: Implement actual emoji mix API
            const mixUrl = `https://files.catbox.moe/0bn6cs.jpg`; // Placeholder
            
            await sock.sendMessage(m.chat, {
                sticker: { url: mixUrl }
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to mix emojis.');
        }
    }
};

// Sticker to image
export const toimg = {
    name: 'toimg',
    aliases: ['toimage'],
    category: 'sticker',
    description: 'Convert sticker to image',
    execute: async (sock, m, args) => {
        const quoted = m.quoted || m;
        
        if (!quoted.message?.stickerMessage) {
            return m.reply('❌ Please reply to a sticker!');
        }
        
        try {
            m.reply('🖼️ Converting sticker to image...');
            
            const media = await sock.downloadMediaMessage(quoted);
            
            await sock.sendMessage(m.chat, {
                image: media,
                caption: '✅ Sticker converted to image!'
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to convert sticker.');
        }
    }
};

---
// commands/game/game.js - Game Commands

// Dice roll game
export const dice = {
    name: 'dice',
    aliases: ['roll'],
    category: 'game',
    description: 'Roll a dice',
    execute: async (sock, m, args) => {
        const sides = parseInt(args[0]) || 6;
        if (sides < 2 || sides > 100) return m.reply('❌ Dice sides must be between 2-100!');
        
        const result = Math.floor(Math.random() * sides) + 1;
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        
        const diceText = `*🎲 DICE ROLL*\n\n${sides <= 6 ? diceEmojis[result - 1] : '🎯'}\n\n*Result:* ${result} (out of ${sides})\n*Player:* ${m.pushName}\n\n🎮 *Play again:* .dice ${sides}`;
        
        await sock.sendMessage(m.chat, { text: diceText }, { quoted: m });
    }
};

// Coin flip game
export const coinflip = {
    name: 'coinflip',
    aliases: ['flip', 'coin'],
    category: 'game',
    description: 'Flip a coin',
    execute: async (sock, m, args) => {
        const userChoice = args[0]?.toLowerCase();
        const validChoices = ['heads', 'tails', 'h', 't'];
        
        if (userChoice && !validChoices.includes(userChoice)) {
            return m.reply('❌ Choose heads (h) or tails (t)!\n\nExample: .coinflip heads');
        }
        
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const emoji = result === 'heads' ? '🪙' : '🔄';
        
        let resultText = `*🪙 COIN FLIP*\n\n${emoji}\n\n*Result:* ${result.toUpperCase()}\n*Player:* ${m.pushName}`;
        
        if (userChoice) {
            const normalizedChoice = userChoice === 'h' ? 'heads' : userChoice === 't' ? 'tails' : userChoice;
            const won = normalizedChoice === result;
            
            resultText += `\n*Your Guess:* ${normalizedChoice.toUpperCase()}\n*Result:* ${won ? '🎉 You Win!' : '💔 You Lose!'}`;
            
            // Update user stats
            if (!global.db.users[m.sender].games) {
                global.db.users[m.sender].games = { wins: 0, losses: 0 };
            }
            
            if (won) {
                global.db.users[m.sender].games.wins++;
                global.db.users[m.sender].exp += 10;
            } else {
                global.db.users[m.sender].games.losses++;
            }
        }
        
        resultText += '\n\n🎮 *Play again:* .coinflip heads/tails';
        
        await sock.sendMessage(m.chat, { text: resultText }, { quoted: m });
    }
};

// Trivia game
export const trivia = {
    name: 'trivia',
    aliases: ['quiz'],
    category: 'game',
    description: 'Play trivia quiz',
    execute: async (sock, m, args) => {
        const triviaQuestions = [
            {
                question: "What is the capital of France?",
                options: ["A) London", "B) Berlin", "C) Paris", "D) Madrid"],
                answer: "C",
                explanation: "Paris is the capital and largest city of France."
            },
            {
                question: "Which planet is known as the Red Planet?",
                options: ["A) Venus", "B) Mars", "C) Jupiter", "D) Saturn"],
                answer: "B",
                explanation: "Mars is called the Red Planet due to its reddish appearance."
            },
            {
                question: "Who created the programming language JavaScript?",
                options: ["A) Brendan Eich", "B) Dennis Ritchie", "C) Bjarne Stroustrup", "D) James Gosling"],
                answer: "A",
                explanation: "Brendan Eich created JavaScript in 1995 while working at Netscape."
            },
            {
                question: "What is the largest ocean on Earth?",
                options: ["A) Atlantic", "B) Indian", "C) Arctic", "D) Pacific"],
                answer: "D",
                explanation: "The Pacific Ocean is the largest and deepest ocean on Earth."
            }
        ];
        
        const randomQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
        
        const triviaText = `*🧠 TRIVIA QUIZ*\n\n*Question:*\n${randomQuestion.question}\n\n*Options:*\n${randomQuestion.options.join('\n')}\n\n💡 *Reply with A, B, C, or D*\n⏰ *Time limit: 30 seconds*\n\n🎮 *Player:* ${m.pushName}`;
        
        const sentMsg = await sock.sendMessage(m.chat, { text: triviaText }, { quoted: m });
        
        // Store the correct answer temporarily
        global.triviaAnswers = global.triviaAnswers || {};
        global.triviaAnswers[sentMsg.key.id] = randomQuestion;
        
        // Set timeout for auto-answer
        setTimeout(() => {
            if (global.triviaAnswers[sentMsg.key.id]) {
                sock.sendMessage(m.chat, {
                    text: `⏰ *Time's up!*\n\n*Correct Answer:* ${randomQuestion.answer}\n*Explanation:* ${randomQuestion.explanation}`
                });
                delete global.triviaAnswers[sentMsg.key.id];
            }
        }, 30000);
    }
};

// Tic Tac Toe game
export const tictactoe = {
    name: 'tictactoe',
    aliases: ['ttt', 'tic'],
    category: 'game',
    description: 'Play Tic Tac Toe',
    execute: async (sock, m, args) => {
        if (!m.mentionedJid || !m.mentionedJid[0]) {
            return m.reply('❌ Please mention someone to play with!\n\nExample: .tictactoe @user');
        }
        
        const opponent = m.mentionedJid[0];
        if (opponent === m.sender) return m.reply('❌ You cannot play against yourself!');
        
        // Initialize game
        const gameBoard = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
        const gameId = `${m.chat}_${Date.now()}`;
        
        // Store game data
        global.ticTacToeGames = global.ticTacToeGames || {};
        global.ticTacToeGames[gameId] = {
            board: gameBoard,
            players: [m.sender, opponent],
            currentPlayer: 0,
            gameOver: false
        };
        
        const gameText = `*❌⭕ TIC TAC TOE*\n\n*Players:*\n❌ ${m.pushName}\n⭕ @${opponent.split('@')[0]}\n\n*Board:*\n${gameBoard[0]} ${gameBoard[1]} ${gameBoard[2]}\n${gameBoard[3]} ${gameBoard[4]} ${gameBoard[5]}\n${gameBoard[6]} ${gameBoard[7]} ${gameBoard[8]}\n\n*Current Turn:* ${m.pushName} (❌)\n\n💡 *Reply with a number (1-9) to make your move*\n🎮 *Game ID:* ${gameId}`;
        
        await sock.sendMessage(m.chat, {
            text: gameText,
            mentions: [opponent]
        }, { quoted: m });
    }
};

// Memory game
export const memorygame = {
    name: 'memorygame',
    aliases: ['memory', 'remember'],
    category: 'game',
    description: 'Test your memory',
    execute: async (sock, m, args) => {
        const emojis = ['🍎', '🍌', '🍇', '🍊', '🍓', '🥝', '🍑', '🥭', '🍍', '🥥'];
        const difficulty = parseInt(args[0]) || 4;
        
        if (difficulty < 3 || difficulty > 8) {
            return m.reply('❌ Difficulty must be between 3-8!\n\nExample: .memorygame 5');
        }
        
        const sequence = [];
        for (let i = 0; i < difficulty; i++) {
            sequence.push(emojis[Math.floor(Math.random() * emojis.length)]);
        }
        
        const memoryText = `*🧠 MEMORY GAME*\n\n*Difficulty:* ${difficulty} items\n*Player:* ${m.pushName}\n\n*Memorize this sequence:*\n${sequence.join(' ')}\n\n⏰ *Study time: 10 seconds*\n💡 *Then type the sequence back*`;
        
        await sock.sendMessage(m.chat, { text: memoryText }, { quoted: m });
        
        // Store the sequence
        global.memoryGames = global.memoryGames || {};
        global.memoryGames[m.sender] = sequence;
        
        // Hide the sequence after 10 seconds
        setTimeout(() => {
            if (global.memoryGames[m.sender]) {
                sock.sendMessage(m.chat, {
                    text: `*🧠 MEMORY TEST*\n\nTime's up! Now type the sequence you memorized:\n\n💡 *Format:* Type the emojis separated by spaces\n⏰ *Time limit: 30 seconds*`
                });
                
                // Auto-fail after 30 seconds
                setTimeout(() => {
                    if (global.memoryGames[m.sender]) {
                        sock.sendMessage(m.chat, {
                            text: `⏰ *Time's up!*\n\n*Correct sequence:* ${sequence.join(' ')}\n\n🎮 *Play again:* .memorygame ${difficulty}`
                        });
                        delete global.memoryGames[m.sender];
                    }
                }, 30000);
            }
        }, 10000);
    }
};
// Ban member (kick + block from rejoining while banned)
export const ban = {
    name: 'ban',
    category: 'group',
    description: 'Ban a member from the group',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.isBotAdmins) return m.reply('❌ Bot needs to be admin to ban members!');
        if (!m.mentionedJid || !m.mentionedJid[0]) return m.reply('❌ Please mention a user to ban!\n\nExample: .ban @user');

        try {
            const target = m.mentionedJid[0];
            if (m.groupAdmins.includes(target)) return m.reply('❌ Cannot ban another admin!');

            setBanned(m.chat, target, true);
            await sock.groupParticipantsUpdate(m.chat, [target], 'remove');
            m.reply(`🔨 @${target.split('@')[0]} has been banned and cannot rejoin.`, { mentions: [target] });
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to ban member.');
        }
    }
};

// Unban member
export const unban = {
    name: 'unban',
    category: 'group',
    description: 'Lift a ban on a member',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.mentionedJid || !m.mentionedJid[0]) return m.reply('❌ Please mention a user to unban!\n\nExample: .unban @user');

        setBanned(m.chat, m.mentionedJid[0], false);
        m.reply(`✅ @${m.mentionedJid[0].split('@')[0]} has been unbanned.`, { mentions: [m.mentionedJid[0]] });
    }
};

// Demote member
export const demote = {
    name: 'demote',
    category: 'group',
    description: 'Demote an admin to regular member',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.isBotAdmins) return m.reply('❌ Bot needs to be admin to demote members!');
        if (!m.mentionedJid || !m.mentionedJid[0]) return m.reply('❌ Please mention a user to demote!\n\nExample: .demote @user');

        try {
            const target = m.mentionedJid[0];
            const response = await sock.groupParticipantsUpdate(m.chat, [target], 'demote');
            if (response[0].status === 'success') {
                m.reply(`✅ @${target.split('@')[0]} has been demoted.`, { mentions: [target] });
            } else {
                m.reply('❌ Failed to demote member.');
            }
        } catch (error) {
            console.error(error);
            m.reply('❌ Failed to demote member.');
        }
    }
};

// Mute member (deletes their messages for a duration, since WhatsApp has no native per-user mute)
export const mute = {
    name: 'mute',
    category: 'group',
    description: 'Mute a member for N minutes (default 60)',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.mentionedJid || !m.mentionedJid[0]) return m.reply('❌ Please mention a user to mute!\n\nExample: .mute @user 60');

        const target = m.mentionedJid[0];
        const minutes = parseInt(args[1]) || 60;
        setMuted(m.chat, target, Date.now() + minutes * 60000);
        m.reply(`🔇 @${target.split('@')[0]} has been muted for ${minutes} minutes. Their messages will be deleted.`, { mentions: [target] });
    }
};

// Unmute member
export const unmute = {
    name: 'unmute',
    category: 'group',
    description: 'Unmute a member',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.mentionedJid || !m.mentionedJid[0]) return m.reply('❌ Please mention a user to unmute!\n\nExample: .unmute @user');

        setMuted(m.chat, m.mentionedJid[0], null);
        m.reply(`🔊 @${m.mentionedJid[0].split('@')[0]} has been unmuted.`, { mentions: [m.mentionedJid[0]] });
    }
};

// Warn member — auto-kicks at the group's maxWarnings threshold
export const warn = {
    name: 'warn',
    category: 'group',
    description: 'Warn a member',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.mentionedJid || !m.mentionedJid[0]) return m.reply('❌ Please mention a user to warn!\n\nExample: .warn @user');

        const target = m.mentionedJid[0];
        const settings = getGroupSettings(m.chat);
        const count = addWarning(m.chat, target);
        const max = settings.maxWarnings || 3;

        if (count >= max) {
            try {
                if (m.isBotAdmins) await sock.groupParticipantsUpdate(m.chat, [target], 'remove');
                clearWarnings(m.chat, target);
                m.reply(`🔨 @${target.split('@')[0]} reached ${max} warnings and was removed.`, { mentions: [target] });
            } catch (e) {
                m.reply(`⚠️ @${target.split('@')[0]} reached ${max} warnings but bot isn't admin to remove them.`, { mentions: [target] });
            }
        } else {
            m.reply(`⚠️ @${target.split('@')[0]} has been warned (${count}/${max}).`, { mentions: [target] });
        }
    }
};

export const warnings = {
    name: 'warnings',
    category: 'group',
    description: 'Check a member\'s warning count',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        const target = (m.mentionedJid && m.mentionedJid[0]) || m.sender;
        const count = getWarnings(m.chat, target);
        m.reply(`⚠️ @${target.split('@')[0]} has ${count} warning(s).`, { mentions: [target] });
    }
};

export const clearwarns = {
    name: 'clearwarns',
    category: 'group',
    description: 'Clear a member\'s warnings',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.mentionedJid || !m.mentionedJid[0]) return m.reply('❌ Please mention a user!\n\nExample: .clearwarns @user');

        clearWarnings(m.chat, m.mentionedJid[0]);
        m.reply(`✅ Warnings cleared for @${m.mentionedJid[0].split('@')[0]}.`, { mentions: [m.mentionedJid[0]] });
    }
};

// Lock group — only admins can send messages
export const lock = {
    name: 'lock',
    category: 'group',
    description: 'Only admins can send messages',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.isBotAdmins) return m.reply('❌ Bot needs to be admin to lock the group!');

        await sock.groupSettingUpdate(m.chat, 'announcement');
        m.reply('🔒 Group locked. Only admins can send messages now.');
    }
};

export const unlock = {
    name: 'unlock',
    category: 'group',
    description: 'Allow everyone to send messages again',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');
        if (!m.isBotAdmins) return m.reply('❌ Bot needs to be admin to unlock the group!');

        await sock.groupSettingUpdate(m.chat, 'not_announcement');
        m.reply('🔓 Group unlocked. Everyone can send messages now.');
    }
};

// Antilink toggle: .antilink off | delete | kick
export const antilink = {
    name: 'antilink',
    category: 'group',
    description: 'Toggle link auto-moderation: off / delete / kick',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');

        const mode = (args[0] || '').toLowerCase();
        if (!['off', 'delete', 'kick'].includes(mode)) {
            return m.reply('❌ Usage: .antilink off|delete|kick');
        }
        updateGroupSettings(m.chat, { antilink: mode });
        m.reply(`🔗 Antilink set to: *${mode}*`);
    }
};

// Antibadword toggle: .antibadword off | warn | delete | kick
export const antibadword = {
    name: 'antibadword',
    aliases: ['antibadwords'],
    category: 'group',
    description: 'Toggle bad-language auto-moderation: off / warn / delete / kick',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        if (!m.isAdmins) return m.reply('❌ Only group admins can use this command!');

        const mode = (args[0] || '').toLowerCase();
        if (!['off', 'warn', 'delete', 'kick'].includes(mode)) {
            return m.reply('❌ Usage: .antibadword off|warn|delete|kick');
        }
        updateGroupSettings(m.chat, { antibadword: mode });
        m.reply(`🤬 Antibadword set to: *${mode}*`);
    }
};

// Show current group settings
export const settings = {
    name: 'settings',
    category: 'group',
    description: 'Show this group\'s moderation settings',
    execute: async (sock, m, args) => {
        if (!m.isGroup) return m.reply('❌ This command can only be used in groups!');
        const s = getGroupSettings(m.chat);
        m.reply(
            `⚙️ *Group Settings*\n\n` +
            `🔗 Antilink: *${s.antilink}*\n` +
            `🤬 Antibadword: *${s.antibadword}*\n` +
            `👋 Welcome messages: *${s.welcome ? 'on' : 'off'}*\n` +
            `⚠️ Max warnings: *${s.maxWarnings}*\n\n` +
            `_Manage these from your dashboard or with .antilink / .antibadword commands._`
        );
    }
};

// Menu / help
export const gmenu = {
    name: 'gmenu',
    aliases: ['ghelp'],
    category: 'group',
    description: 'List available group management commands',
    execute: async (sock, m, args) => {
        m.reply(
            `📋 *Group Management Menu*\n\n` +
            `*Members:* .add .kick .ban .unban .promote .demote .mute .unmute\n` +
            `*Moderation:* .warn .warnings .clearwarns .antilink .antibadword\n` +
            `*Group:* .lock .unlock .tagall .hidetag .pin .settings\n\n` +
            `_Prefix may differ — check your dashboard._`
        );
    }
};
