import axios from 'axios';
import fs from 'fs';
import { getBuffer, getRandom } from '../../lib/myfunc.js';
// Base API configuration
const API_BASE = 'https://api.giftedtech.web.id/api';
const API_KEY = 'gifted';

// Helper function to make API requests
const makeApiRequest = async (endpoint, params = {}) => {
    try {
        const url = new URL(`${API_BASE}${endpoint}`);
        url.searchParams.append('apikey', API_KEY);
        
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
        
        const response = await axios.get(url.toString(), {
            timeout: 30000,
            headers: {
                'User-Agent': 'CIARA-IV-Bot/4.0.0'
            }
        });
        
        return response.data;
    } catch (error) {
        throw new Error(`API request failed: ${error.message}`);
    }
};

// Play/Song download command
export const play = {
    name: 'play',
    aliases: ['song', 'music'],
    category: 'download',
    description: 'Download music from YouTube',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide a song name!\n\nExample: .play Alan Walker Faded');
        
        try {
            const query = args.join(' ');
            m.reply('🔍 Searching for your song...');
            
            // Search for the song on YouTube first
            const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            
            // For now, ask user to provide YouTube URL or use ytmp3 directly
            const instructions = `*🎵 SONG SEARCH RESULT*\n\n🔍 *Query:* ${query}\n\n*📱 To download, please:*\n1️⃣ Find the song on YouTube\n2️⃣ Copy the YouTube URL\n3️⃣ Use: .ytmp3 [YouTube URL]\n\n*💡 Example:*\n.ytmp3 https://youtu.be/dQw4w9WgXcQ\n\n*🎯 Or use direct commands:*\n• .ytmp3 [url] - Audio only\n• .ytmp4 [url] - Video with audio`;
            
            await sock.sendMessage(m.chat, { text: instructions }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Error searching for song. Please try again.');
        }
    }
};

// YouTube MP3 download
export const ytmp3 = {
    name: 'ytmp3',
    aliases: ['yta', 'ytaudio'],
    category: 'download',
    description: 'Download YouTube video as MP3',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide a YouTube URL!\n\nExample: .ytmp3 https://youtu.be/dQw4w9WgXcQ');
        
        const url = args[0];
        if (!url.includes('youtu')) {
            return m.reply('❌ Please provide a valid YouTube URL!');
        }
        
        try {
            m.reply('🎵 Processing YouTube audio download...');
            
            const result = await makeApiRequest('/download/ytmp3', { url });
            
            if (!result.success) {
                return m.reply('❌ Failed to process the YouTube URL. Please check the link and try again.');
            }
            
            const audioData = result.data;
            const caption = `*🎵 YOUTUBE MP3 DOWNLOAD*\n\n📝 *Title:* ${audioData.title || 'Unknown'}\n👤 *Channel:* ${audioData.channel || 'Unknown'}\n⏱️ *Duration:* ${audioData.duration || 'Unknown'}\n📊 *Quality:* MP3 Audio\n💾 *Size:* ${audioData.size || 'Unknown'}\n\n🎧 *Downloaded by CIARA-IV*`;
            
            // Send audio file
            await sock.sendMessage(m.chat, {
                audio: { url: audioData.download },
                mimetype: 'audio/mp4',
                fileName: `${audioData.title || 'audio'}.mp3`,
                caption: caption
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Error downloading audio. Please check the URL and try again.');
        }
    }
};

// YouTube MP4 download
export const ytmp4 = {
    name: 'ytmp4',
    aliases: ['ytv', 'ytvideo'],
    category: 'download',
    description: 'Download YouTube video as MP4',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide a YouTube URL!\n\nExample: .ytmp4 https://youtu.be/dQw4w9WgXcQ');
        
        const url = args[0];
        if (!url.includes('youtu')) {
            return m.reply('❌ Please provide a valid YouTube URL!');
        }
        
        try {
            m.reply('📹 Processing YouTube video download...');
            
            const result = await makeApiRequest('/download/ytmp4', { url });
            
            if (!result.success) {
                return m.reply('❌ Failed to process the YouTube URL. Please check the link and try again.');
            }
            
            const videoData = result.data;
            const caption = `*📹 YOUTUBE MP4 DOWNLOAD*\n\n📝 *Title:* ${videoData.title || 'Unknown'}\n👤 *Channel:* ${videoData.channel || 'Unknown'}\n⏱️ *Duration:* ${videoData.duration || 'Unknown'}\n📊 *Quality:* ${videoData.quality || 'MP4'}\n💾 *Size:* ${videoData.size || 'Unknown'}\n\n🎬 *Downloaded by CIARA-IV*`;
            
            // Send video file
            await sock.sendMessage(m.chat, {
                video: { url: videoData.download },
                mimetype: 'video/mp4',
                fileName: `${videoData.title || 'video'}.mp4`,
                caption: caption
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Error downloading video. Please check the URL and try again.');
        }
    }
};

// TikTok download
export const tiktok = {
    name: 'tiktok',
    aliases: ['tt', 'tik'],
    category: 'download',
    description: 'Download TikTok videos',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide a TikTok URL!\n\nExample: .tiktok https://vm.tiktok.com/ZMrgKWmVd');
        
        const url = args[0];
        if (!url.includes('tiktok.com') && !url.includes('vm.tiktok.com')) {
            return m.reply('❌ Please provide a valid TikTok URL!');
        }
        
        try {
            m.reply('🎵 Downloading TikTok video...');
            
            const result = await makeApiRequest('/download/tiktok', { url });
            
            if (!result.success) {
                return m.reply('❌ Failed to download TikTok video. Please check the URL and try again.');
            }
            
            const tiktokData = result.data;
            const caption = `*🎵 TIKTOK DOWNLOAD*\n\n📝 *Title:* ${tiktokData.title || 'TikTok Video'}\n👤 *Author:* ${tiktokData.author || 'Unknown'}\n⏱️ *Duration:* ${tiktokData.duration || 'Unknown'}\n💾 *No Watermark*\n\n🎭 *Downloaded by CIARA-IV*`;
            
            // Send video
            await sock.sendMessage(m.chat, {
                video: { url: tiktokData.video },
                mimetype: 'video/mp4',
                caption: caption
            }, { quoted: m });
            
            // Send audio if available
            if (tiktokData.audio) {
                await sock.sendMessage(m.chat, {
                    audio: { url: tiktokData.audio },
                    mimetype: 'audio/mp4',
                    fileName: `${tiktokData.title || 'tiktok'}_audio.mp3`
                }, { quoted: m });
            }
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Error downloading TikTok video. Please check the URL and try again.');
        }
    }
};

// Instagram download
export const instagram = {
    name: 'instagram',
    aliases: ['ig', 'insta'],
    category: 'download',
    description: 'Download Instagram posts, reels, stories',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide an Instagram URL!\n\nExample: .instagram https://www.instagram.com/p/xxxxx');
        
        const url = args[0];
        if (!url.includes('instagram.com')) {
            return m.reply('❌ Please provide a valid Instagram URL!');
        }
        
        try {
            m.reply('📸 Downloading from Instagram...');
            
            const result = await makeApiRequest('/download/instadl', { url });
            
            if (!result.success) {
                return m.reply('❌ Failed to download Instagram media. Please check the URL and try again.');
            }
            
            const instaData = result.data;
            const caption = `*📸 INSTAGRAM DOWNLOAD*\n\n👤 *User:* ${instaData.username || 'Unknown'}\n📝 *Caption:* ${instaData.caption || 'No caption'}\n📅 *Posted:* ${instaData.date || 'Unknown'}\n\n📱 *Downloaded by CIARA-IV*`;
            
            // Handle multiple media (carousel posts)
            if (Array.isArray(instaData.media)) {
                for (let i = 0; i < instaData.media.length; i++) {
                    const media = instaData.media[i];
                    const mediaCaption = `${caption}\n\n📸 *Media ${i + 1}/${instaData.media.length}*`;
                    
                    if (media.type === 'video') {
                        await sock.sendMessage(m.chat, {
                            video: { url: media.url },
                            caption: mediaCaption
                        }, { quoted: m });
                    } else {
                        await sock.sendMessage(m.chat, {
                            image: { url: media.url },
                            caption: mediaCaption
                        }, { quoted: m });
                    }
                    
                    // Delay between multiple media
                    if (i < instaData.media.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } else {
                // Single media
                if (instaData.type === 'video') {
                    await sock.sendMessage(m.chat, {
                        video: { url: instaData.url },
                        caption: caption
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(m.chat, {
                        image: { url: instaData.url },
                        caption: caption
                    }, { quoted: m });
                }
            }
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Error downloading from Instagram. Please check the URL and try again.');
        }
    }
};

// Facebook download
export const facebook = {
    name: 'facebook',
    aliases: ['fb'],
    category: 'download',
    description: 'Download Facebook videos',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide a Facebook URL!\n\nExample: .facebook https://www.facebook.com/reel/xxxxx');
        
        const url = args[0];
        if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
            return m.reply('❌ Please provide a valid Facebook URL!');
        }
        
        try {
            m.reply('📘 Downloading from Facebook...');
            
            const result = await makeApiRequest('/download/facebook', { url });
            
            if (!result.success) {
                return m.reply('❌ Failed to download Facebook video. Please check the URL and try again.');
            }
            
            const fbData = result.data;
            const caption = `*📘 FACEBOOK DOWNLOAD*\n\n📝 *Title:* ${fbData.title || 'Facebook Video'}\n⏱️ *Duration:* ${fbData.duration || 'Unknown'}\n📊 *Quality:* ${fbData.quality || 'HD'}\n💾 *Size:* ${fbData.size || 'Unknown'}\n\n📱 *Downloaded by CIARA-IV*`;
            
            await sock.sendMessage(m.chat, {
                video: { url: fbData.video },
                caption: caption
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Error downloading Facebook video. Please check the URL and try again.');
        }
    }
};

// Twitter download
export const twitter = {
    name: 'twitter',
    aliases: ['tw', 'x'],
    category: 'download',
    description: 'Download Twitter/X videos and images',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide a Twitter/X URL!\n\nExample: .twitter https://twitter.com/user/status/xxxxx');
        
        const url = args[0];
        if (!url.includes('twitter.com') && !url.includes('x.com') && !url.includes('t.co')) {
            return m.reply('❌ Please provide a valid Twitter/X URL!');
        }
        
        try {
            m.reply('🐦 Downloading from Twitter/X...');
            
            const result = await makeApiRequest('/download/twitter', { url });
            
            if (!result.success) {
                return m.reply('❌ Failed to download Twitter media. Please check the URL and try again.');
            }
            
            const twitterData = result.data;
            const caption = `*🐦 TWITTER/X DOWNLOAD*\n\n👤 *User:* ${twitterData.username || 'Unknown'}\n📝 *Tweet:* ${twitterData.text || 'No text'}\n📅 *Posted:* ${twitterData.date || 'Unknown'}\n\n📱 *Downloaded by CIARA-IV*`;
            
            // Handle multiple media
            if (Array.isArray(twitterData.media)) {
                for (const media of twitterData.media) {
                    if (media.type === 'video') {
                        await sock.sendMessage(m.chat, {
                            video: { url: media.url },
                            caption: caption
                        }, { quoted: m });
                    } else if (media.type === 'image') {
                        await sock.sendMessage(m.chat, {
                            image: { url: media.url },
                            caption: caption
                        }, { quoted: m });
                    }
                }
            } else {
                // Single media
                if (twitterData.type === 'video') {
                    await sock.sendMessage(m.chat, {
                        video: { url: twitterData.media },
                        caption: caption
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(m.chat, {
                        image: { url: twitterData.media },
                        caption: caption
                    }, { quoted: m });
                }
            }
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Error downloading from Twitter. Please check the URL and try again.');
        }
    }
};

// Pinterest download
export const pinterest = {
    name: 'pinterest',
    aliases: ['pin'],
    category: 'download',
    description: 'Download Pinterest images/videos',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide a Pinterest URL!\n\nExample: .pinterest https://pin.it/xxxxx');
        
        const url = args[0];
        if (!url.includes('pinterest.com') && !url.includes('pin.it')) {
            return m.reply('❌ Please provide a valid Pinterest URL!');
        }
        
        try {
            m.reply('📌 Downloading from Pinterest...');
            
            const result = await makeApiRequest('/download/pinterestdl', { url });
            
            if (!result.success) {
                return m.reply('❌ Failed to download from Pinterest. Please check the URL and try again.');
            }
            
            const pinterestData = result.data;
            const caption = `*📌 PINTEREST DOWNLOAD*\n\n📝 *Title:* ${pinterestData.title || 'Pinterest Media'}\n💡 *Description:* ${pinterestData.description || 'No description'}\n\n📱 *Downloaded by CIARA-IV*`;
            
            if (pinterestData.type === 'video') {
                await sock.sendMessage(m.chat, {
                    video: { url: pinterestData.media },
                    caption: caption
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, {
                    image: { url: pinterestData.media },
                    caption: caption
                }, { quoted: m });
            }
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Error downloading from Pinterest. Please check the URL and try again.');
        }
    }
};

// Spotify download
export const spotify = {
    name: 'spotify',
    aliases: ['sp'],
    category: 'download',
    description: 'Download Spotify tracks',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide a Spotify URL!\n\nExample: .spotify https://open.spotify.com/track/xxxxx');
        
        const url = args[0];
        if (!url.includes('open.spotify.com')) {
            return m.reply('❌ Please provide a valid Spotify URL!');
        }
        
        try {
            m.reply('🎵 Downloading from Spotify...');
            
            const result = await makeApiRequest('/download/spotifydl', { url });
            
            if (!result.success) {
                return m.reply('❌ Failed to download Spotify track. Please check the URL and try again.');
            }
            
            const spotifyData = result.data;
            const caption = `*🎵 SPOTIFY DOWNLOAD*\n\n🎵 *Title:* ${spotifyData.title || 'Unknown'}\n👤 *Artist:* ${spotifyData.artist || 'Unknown'}\n💿 *Album:* ${spotifyData.album || 'Unknown'}\n⏱️ *Duration:* ${spotifyData.duration || 'Unknown'}\n📅 *Release:* ${spotifyData.release_date || 'Unknown'}\n\n🎧 *Downloaded by CIARA-IV*`;
            
            await sock.sendMessage(m.chat, {
                audio: { url: spotifyData.download },
                mimetype: 'audio/mp4',
                fileName: `${spotifyData.title || 'spotify'}.mp3`,
                caption: caption
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Error downloading Spotify track. Please check the URL and try again.');
        }
    }
};

// APK download
export const apk = {
    name: 'apk',
    aliases: ['app'],
    category: 'download',
    description: 'Download Android APK files',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide an app name!\n\nExample: .apk WhatsApp');
        
        const appName = args.join(' ');
        
        try {
            m.reply('📱 Searching for APK...');
            
            const result = await makeApiRequest('/download/apkdl', { appName });
            
            if (!result.success) {
                return m.reply('❌ Failed to find the APK. Please check the app name and try again.');
            }
            
            const apkData = result.data;
            const caption = `*📱 APK DOWNLOAD*\n\n📝 *App:* ${apkData.name || appName}\n📊 *Version:* ${apkData.version || 'Unknown'}\n💾 *Size:* ${apkData.size || 'Unknown'}\n🏢 *Developer:* ${apkData.developer || 'Unknown'}\n⭐ *Rating:* ${apkData.rating || 'Unknown'}\n\n📲 *Downloaded by CIARA-IV*\n\n⚠️ *Warning:* Install APKs from trusted sources only!`;
            
            await sock.sendMessage(m.chat, {
                document: { url: apkData.download },
                fileName: `${apkData.name || appName}.apk`,
                mimetype: 'application/vnd.android.package-archive',
                caption: caption
            }, { quoted: m });
            
        } catch (error) {
            console.error(error);
            m.reply('❌ Error downloading APK. Please check the app name and try again.');
        }
    }
};
