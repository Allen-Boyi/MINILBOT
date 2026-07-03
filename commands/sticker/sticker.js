import { downloadMediaMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
const stickerCommands = {
    // Convert image/video to sticker
    sticker: async (sock, msg, args) => {
        try {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
                return sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ Please reply to an image or video to convert to sticker!' 
                });
            }

            sock.sendMessage(msg.key.remoteJid, { text: '⏳ Converting to sticker...' });

            const buffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {}
            );

            const stickerBuffer = await convertToSticker(buffer, quoted.videoMessage ? 'video' : 'image');
            
            await sock.sendMessage(msg.key.remoteJid, {
                sticker: stickerBuffer,
            });

        } catch (error) {
            console.error('Sticker conversion error:', error);
            sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Failed to convert to sticker. Please try again!' 
            });
        }
    },

    // Animated text to picture
    attp: async (sock, msg, args) => {
        try {
            const text = args.join(' ');
            if (!text) {
                return sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ Please provide text!\n📝 Usage: .attp Your Text Here' 
                });
            }

            sock.sendMessage(msg.key.remoteJid, { text: '⏳ Creating animated text...' });

            // Using fake API endpoint - replace with real ATTP API
            const response = await axios.get(`https://fake-attp-api.com/attp?text=${encodeURIComponent(text)}`, {
                responseType: 'arraybuffer'
            });

            const stickerBuffer = Buffer.from(response.data);
            
            await sock.sendMessage(msg.key.remoteJid, {
                sticker: stickerBuffer,
            });

        } catch (error) {
            console.error('ATTP error:', error);
            sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Failed to create animated text. API might be down!' 
            });
        }
    },

    // Emoji mix
    emojimix: async (sock, msg, args) => {
        try {
            if (args.length < 2) {
                return sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ Please provide two emojis!\n📝 Usage: .emojimix 😀 😍' 
                });
            }

            const emoji1 = args[0];
            const emoji2 = args[1];

            sock.sendMessage(msg.key.remoteJid, { text: '⏳ Mixing emojis...' });

            // Using fake API endpoint - replace with real EmojiMix API
            const response = await axios.get(`https://fake-emojimix-api.com/mix?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`, {
                responseType: 'arraybuffer'
            });

            const stickerBuffer = Buffer.from(response.data);
            
            await sock.sendMessage(msg.key.remoteJid, {
                sticker: stickerBuffer,
            });

        } catch (error) {
            console.error('EmojiMix error:', error);
            sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Failed to mix emojis. Please try with different emojis!' 
            });
        }
    },

    // Sticker with full quality
    sfull: async (sock, msg, args) => {
        try {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) {
                return sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ Please reply to an image or video!' 
                });
            }

            sock.sendMessage(msg.key.remoteJid, { text: '⏳ Converting with full quality...' });

            const buffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {}
            );

            const stickerBuffer = await convertToSticker(buffer, quoted.videoMessage ? 'video' : 'image', true);
            
            await sock.sendMessage(msg.key.remoteJid, {
                sticker: stickerBuffer,
            });

        } catch (error) {
            console.error('SFull error:', error);
            sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Failed to convert with full quality!' 
            });
        }
    },

    // Convert sticker to image
    toimg: async (sock, msg, args) => {
        try {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted || !quoted.stickerMessage) {
                return sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ Please reply to a sticker!' 
                });
            }

            sock.sendMessage(msg.key.remoteJid, { text: '⏳ Converting sticker to image...' });

            const buffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {}
            );

            const imageBuffer = await convertStickerToImage(buffer);
            
            await sock.sendMessage(msg.key.remoteJid, {
                image: imageBuffer,
                caption: '✅ Sticker converted to image!'
            });

        } catch (error) {
            console.error('ToImg error:', error);
            sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Failed to convert sticker to image!' 
            });
        }
    },

    // Create meme sticker
    stickermeme: async (sock, msg, args) => {
        try {
            const text = args.join(' ');
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            if (!quoted || !quoted.imageMessage) {
                return sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ Please reply to an image with text!\n📝 Usage: .stickermeme Top Text|Bottom Text' 
                });
            }

            if (!text) {
                return sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ Please provide meme text!\n📝 Usage: .stickermeme Top Text|Bottom Text' 
                });
            }

            sock.sendMessage(msg.key.remoteJid, { text: '⏳ Creating meme sticker...' });

            const buffer = await downloadMediaMessage(
                { message: quoted },
                'buffer',
                {}
            );

            const [topText, bottomText] = text.split('|');
            const memeBuffer = await createMemeSticker(buffer, topText?.trim() || '', bottomText?.trim() || '');
            
            await sock.sendMessage(msg.key.remoteJid, {
                sticker: memeBuffer,
            });

        } catch (error) {
            console.error('StickerMeme error:', error);
            sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Failed to create meme sticker!' 
            });
        }
    },

    // Get sticker pack info
    stickerpack: async (sock, msg, args) => {
        try {
            const packName = args.join(' ') || 'CIARA-IV Stickers';
            
            const stickerPackInfo = {
                name: packName,
                publisher: 'CraigeeX🫟',
                total: Math.floor(Math.random() * 30) + 10, // Random count for demo
                created: new Date().toLocaleDateString()
            };

            const response = `📦 *STICKER PACK INFO*\n\n` +
                           `📝 Name: ${stickerPackInfo.name}\n` +
                           `👤 Publisher: ${stickerPackInfo.publisher}\n` +
                           `🔢 Total Stickers: ${stickerPackInfo.total}\n` +
                           `📅 Created: ${stickerPackInfo.created}\n\n` +
                           `💡 Use .sticker to add more stickers to this pack!`;

            await sock.sendMessage(msg.key.remoteJid, { text: response });

        } catch (error) {
            console.error('StickerPack error:', error);
            sock.sendMessage(msg.key.remoteJid, { 
                text: '❌ Failed to get sticker pack info!' 
            });
        }
    }
};

// Helper function to convert media to sticker
async function convertToSticker(buffer, type, highQuality = false) {
    return new Promise((resolve, reject) => {
        const inputPath = `./temp/input_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
        const outputPath = `./temp/sticker_${Date.now()}.webp`;

        fs.writeFileSync(inputPath, buffer);

        let command = ffmpeg(inputPath)
            .toFormat('webp')
            .size('512x512')
            .autopad()
            .output(outputPath);

        if (type === 'video') {
            command = command.duration(6).fps(15);
        }

        if (highQuality) {
            command = command.outputOptions(['-quality', '95']);
        } else {
            command = command.outputOptions(['-quality', '75']);
        }

        command
            .on('end', () => {
                const stickerBuffer = fs.readFileSync(outputPath);
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(stickerBuffer);
            })
            .on('error', (err) => {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                reject(err);
            })
            .run();
    });
}

// Helper function to convert sticker to image
async function convertStickerToImage(buffer) {
    return new Promise((resolve, reject) => {
        const inputPath = `./temp/sticker_${Date.now()}.webp`;
        const outputPath = `./temp/image_${Date.now()}.png`;

        fs.writeFileSync(inputPath, buffer);

        ffmpeg(inputPath)
            .toFormat('png')
            .output(outputPath)
            .on('end', () => {
                const imageBuffer = fs.readFileSync(outputPath);
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(imageBuffer);
            })
            .on('error', (err) => {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                reject(err);
            })
            .run();
    });
}

// Helper function to create meme sticker
async function createMemeSticker(buffer, topText, bottomText) {
    return new Promise((resolve, reject) => {
        const inputPath = `./temp/input_${Date.now()}.jpg`;
        const outputPath = `./temp/meme_${Date.now()}.webp`;

        fs.writeFileSync(inputPath, buffer);

        let filters = [];
        
        if (topText) {
            filters.push(`drawtext=text='${topText}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=50:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`);
        }
        
        if (bottomText) {
            filters.push(`drawtext=text='${bottomText}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=h-100:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`);
        }

        ffmpeg(inputPath)
            .toFormat('webp')
            .size('512x512')
            .autopad()
            .videoFilters(filters)
            .output(outputPath)
            .on('end', () => {
                const memeBuffer = fs.readFileSync(outputPath);
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(memeBuffer);
            })
            .on('error', (err) => {
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                reject(err);
            })
            .run();
    });
}

export default stickerCommands;