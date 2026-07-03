import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import axios from 'axios';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url); // shim for lazy require('sharp') / require('pdfkit') etc below
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Convert commands for CIARA-IV Bot
const convertCommands = {
    // Convert video to audio
    toaudio: async (sock, msg, args) => {
        try {
            if (!msg.message.videoMessage && !msg.message.documentMessage) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please reply to a video file with .toaudio'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: '🔄 Converting video to audio... Please wait.'
            });

            // Download video
            const mediaPath = await downloadMedia(sock, msg);
            const outputPath = path.join(__dirname, '../../temp', `audio_${Date.now()}.mp3`);

            // Convert using ffmpeg
            ffmpeg(mediaPath)
                .toFormat('mp3')
                .on('end', async () => {
                    await sock.sendMessage(msg.key.remoteJid, {
                        audio: { url: outputPath },
                        mimetype: 'audio/mp4',
                        caption: '✅ Converted by CIARA-IV'
                    });
                    
                    // Cleanup
                    fs.unlinkSync(mediaPath);
                    fs.unlinkSync(outputPath);
                })
                .on('error', (err) => {
                    console.error('Conversion error:', err);
                    sock.sendMessage(msg.key.remoteJid, {
                        text: '❌ Failed to convert video to audio'
                    });
                })
                .save(outputPath);

        } catch (error) {
            console.error('ToAudio error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error converting video to audio'
            });
        }
    },

    // Convert to MP3
    tomp3: async (sock, msg, args) => {
        try {
            if (!msg.message.audioMessage && !msg.message.videoMessage) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please reply to an audio/video file with .tomp3'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: '🔄 Converting to MP3... Please wait.'
            });

            const mediaPath = await downloadMedia(sock, msg);
            const outputPath = path.join(__dirname, '../../temp', `mp3_${Date.now()}.mp3`);

            ffmpeg(mediaPath)
                .toFormat('mp3')
                .audioBitrate(128)
                .on('end', async () => {
                    await sock.sendMessage(msg.key.remoteJid, {
                        document: { url: outputPath },
                        mimetype: 'audio/mpeg',
                        fileName: `converted_${Date.now()}.mp3`,
                        caption: '✅ Converted to MP3 by CIARA-IV'
                    });
                    
                    fs.unlinkSync(mediaPath);
                    fs.unlinkSync(outputPath);
                })
                .save(outputPath);

        } catch (error) {
            console.error('ToMP3 error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error converting to MP3'
            });
        }
    },

    // Convert images to PDF
    img2pdf: async (sock, msg, args) => {
        try {
            if (!msg.message.imageMessage) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please reply to an image with .img2pdf'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: '🔄 Converting image to PDF... Please wait.'
            });

            const imagePath = await downloadMedia(sock, msg);
            const outputPath = path.join(__dirname, '../../temp', `pdf_${Date.now()}.pdf`);

            // Use sharp and PDFKit for conversion
            const sharp = require('sharp');
            const PDFDocument = require('pdfkit');

            const imageBuffer = await sharp(imagePath).jpeg().toBuffer();
            const doc = new PDFDocument();
            
            doc.pipe(fs.createWriteStream(outputPath));
            doc.image(imageBuffer, 50, 50, { fit: [500, 700] });
            doc.end();

            setTimeout(async () => {
                await sock.sendMessage(msg.key.remoteJid, {
                    document: { url: outputPath },
                    mimetype: 'application/pdf',
                    fileName: `converted_${Date.now()}.pdf`,
                    caption: '✅ Image converted to PDF by CIARA-IV'
                });
                
                fs.unlinkSync(imagePath);
                fs.unlinkSync(outputPath);
            }, 2000);

        } catch (error) {
            console.error('Img2PDF error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error converting image to PDF'
            });
        }
    },

    // Convert PDF to images
    pdf2img: async (sock, msg, args) => {
        try {
            if (!msg.message.documentMessage || !msg.message.documentMessage.fileName.endsWith('.pdf')) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please reply to a PDF file with .pdf2img'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: '🔄 Converting PDF to images... Please wait.'
            });

            const pdfPath = await downloadMedia(sock, msg);
            const outputDir = path.join(__dirname, '../../temp', `pdf2img_${Date.now()}`);
            
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Use pdf2pic for conversion
            const pdf2pic = require('pdf2pic');
            const convert = pdf2pic.fromPath(pdfPath, {
                density: 100,
                saveFilename: 'page',
                savePath: outputDir,
                format: 'jpg',
                width: 600,
                height: 600
            });

            const results = await convert.bulk(-1);
            
            for (let i = 0; i < results.length; i++) {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: { url: results[i].path },
                    caption: `📄 Page ${i + 1} - Converted by CIARA-IV`
                });
            }

            // Cleanup
            fs.unlinkSync(pdfPath);
            fs.rmSync(outputDir, { recursive: true, force: true });

        } catch (error) {
            console.error('PDF2Img error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error converting PDF to images'
            });
        }
    },

    // Convert audio to text (Speech Recognition)
    audio2text: async (sock, msg, args) => {
        try {
            if (!msg.message.audioMessage) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please reply to an audio message with .audio2text'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: '🔄 Converting audio to text... Please wait.'
            });

            const audioPath = await downloadMedia(sock, msg);
            
            // Convert to wav first
            const wavPath = path.join(__dirname, '../../temp', `audio_${Date.now()}.wav`);
            
            ffmpeg(audioPath)
                .toFormat('wav')
                .audioChannels(1)
                .audioFrequency(16000)
                .on('end', async () => {
                    try {
                        // Use OpenAI Whisper API (Replace with your API key)
                        const formData = new FormData();
                        formData.append('file', fs.createReadStream(wavPath));
                        formData.append('model', 'whisper-1');

                        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
                            headers: {
                                'Authorization': 'Bearer YOUR_OPENAI_API_KEY', // Replace with actual API key
                                'Content-Type': 'multipart/form-data'
                            }
                        });

                        const transcription = response.data.text;

                        await sock.sendMessage(msg.key.remoteJid, {
                            text: `🎵➡️📝 *Audio Transcription:*\n\n${transcription}\n\n✅ Converted by CIARA-IV`
                        });

                        fs.unlinkSync(audioPath);
                        fs.unlinkSync(wavPath);

                    } catch (apiError) {
                        console.error('Transcription API error:', apiError);
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: '❌ Error transcribing audio. Please check API configuration.'
                        });
                    }
                })
                .save(wavPath);

        } catch (error) {
            console.error('Audio2Text error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error converting audio to text'
            });
        }
    },

    // Convert text to audio (Text-to-Speech)
    text2audio: async (sock, msg, args) => {
        try {
            const text = args.join(' ');
            if (!text) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please provide text to convert to audio\nExample: .text2audio Hello World'
                });
            }

            if (text.length > 500) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Text too long. Maximum 500 characters allowed.'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: '🔄 Converting text to audio... Please wait.'
            });

            // Use Google TTS API or similar
            const gtts = require('gtts');
            const outputPath = path.join(__dirname, '../../temp', `tts_${Date.now()}.mp3`);

            const tts = new gtts(text, 'en');
            
            tts.save(outputPath, async (err) => {
                if (err) {
                    console.error('TTS error:', err);
                    return sock.sendMessage(msg.key.remoteJid, {
                        text: '❌ Error converting text to audio'
                    });
                }

                await sock.sendMessage(msg.key.remoteJid, {
                    audio: { url: outputPath },
                    mimetype: 'audio/mp4',
                    caption: '🔊 Text-to-Speech by CIARA-IV'
                });

                fs.unlinkSync(outputPath);
            });

        } catch (error) {
            console.error('Text2Audio error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error converting text to audio'
            });
        }
    },

    // Convert video to GIF
    vid2gif: async (sock, msg, args) => {
        try {
            if (!msg.message.videoMessage) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please reply to a video with .vid2gif'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: '🔄 Converting video to GIF... Please wait.'
            });

            const videoPath = await downloadMedia(sock, msg);
            const outputPath = path.join(__dirname, '../../temp', `gif_${Date.now()}.gif`);

            ffmpeg(videoPath)
                .outputOptions([
                    '-vf', 'fps=15,scale=320:-1:flags=lanczos,palettegen',
                    '-t', '10' // Limit to 10 seconds
                ])
                .toFormat('gif')
                .on('end', async () => {
                    await sock.sendMessage(msg.key.remoteJid, {
                        video: { url: outputPath },
                        gifPlayback: true,
                        caption: '🎬 Video converted to GIF by CIARA-IV'
                    });

                    fs.unlinkSync(videoPath);
                    fs.unlinkSync(outputPath);
                })
                .save(outputPath);

        } catch (error) {
            console.error('Vid2GIF error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error converting video to GIF'
            });
        }
    },

    // Upload image and get URL
    img2url: async (sock, msg, args) => {
        try {
            if (!msg.message.imageMessage) {
                return sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Please reply to an image with .img2url'
                });
            }

            await sock.sendMessage(msg.key.remoteJid, {
                text: '🔄 Uploading image and generating URL... Please wait.'
            });

            const imagePath = await downloadMedia(sock, msg);
            
            // Upload to Telegraph or similar service
            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', fs.createReadStream(imagePath));

            const response = await axios.post('https://telegra.ph/upload', form, {
                headers: form.getHeaders()
            });

            const imageUrl = `https://telegra.ph${response.data[0].src}`;

            await sock.sendMessage(msg.key.remoteJid, {
                text: `🔗 *Image URL Generated:*\n\n${imageUrl}\n\n✅ Uploaded by CIARA-IV`
            });

            fs.unlinkSync(imagePath);

        } catch (error) {
            console.error('Img2URL error:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Error uploading image and generating URL'
            });
        }
    }
};

// Helper function to download media
async function downloadMedia(sock, msg) {
    try {
        const buffer = await sock.downloadMediaMessage(msg);
        const tempPath = path.join(__dirname, '../../temp', `media_${Date.now()}`);
        fs.writeFileSync(tempPath, buffer);
        return tempPath;
    } catch (error) {
        console.error('Download media error:', error);
        throw error;
    }
}

export default convertCommands;