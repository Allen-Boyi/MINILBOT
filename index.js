// ==========================================
// 🕸MINIMALIST 1.0 ⏍
// Telegram Media Downloader Bot
// Developed by CraigeeX - CIARA TEAM INC
// 
// 💡 API Update: Now using a single unified ytmax endpoint.
// ==========================================

const { Telegraf } = require('telegraf');
const axios = require('axios');
const yts = require('yt-search');
const cron = require('node-cron');
const acrcloud = require('acrcloud');
const fs = require('fs').promises;

// ==========================================
// CONFIGURATION
// ==========================================
const config = {
  botToken: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
  adminUsername: 'CraigeeX',
  adminChatId: null,
  
  contact: {
    email: 'ciara.info.inc@gmail.com',
    whatsapp: '+27847826044',
    website: 'minimalist.gleeze.com',
    channel: 'https://whatsapp.com/channel/0029VbAiD141t90dCPkpha0T'
  },
  
  apis: {
    // 💡 UPDATED: Using the single unified ytmax API for audio and video
    ytmax: 'https://api.mrfrankofc.gleeze.com/api/d/ytmax', 
    lyrics: 'https://some-random-api.com/lyrics',
    // audio, video, and videoApiKey removed
  },
  
  acrcloud: {
    host: 'identify-us-west-2.acrcloud.com',
    access_key: '4ee38e62e85515a47158a47158aeb3d26fb741',
    access_secret: 'KZd3cUQoOYSmZQn1n5ACW5XSbqGlKLhg6G8S8EvK'
  },
  
  downloadTimeout: 180000,
  messageTimeout: {
    short: 2000,
    medium: 5000,
    long: 10000
  }
};

if (!config.botToken || config.botToken === 'YOUR_BOT_TOKEN_HERE') {
  console.error('❌ ERROR: BOT_TOKEN not set');
  process.exit(1);
}

// ==========================================
// LOGGER
// ==========================================
const logger = {
  info: (...args) => console.log(`[${new Date().toISOString()}] [INFO]`, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] [ERROR]`, ...args),
  warn: (...args) => console.warn(`[${new Date().toISOString()}] [WARN]`, ...args)
};

// ==========================================
// DATA STORAGE
// ==========================================
const botUsers = new Map();
const pendingDownloads = new Map();
const downloadStats = {
  audio: new Map(),
  video: new Map(),
  total: 0
};

// ==========================================
// ANIMATED LOADING BARS
// ==========================================
const LoadingAnimations = {
  wave: [
    '⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥',
    '⎸⎮|⎹⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸∥⎮',
    '⎸⎮⎮|⎹⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸∥⎸⎮',
    '⎸⎮⎮⎮|⎹⎸⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸∥⎮⎸⎮',
    '⎸⎮⎮⎮⎸|⎹⎸⎮⎮⎸⎮⎸⎮⎸⎮⎸∥⎮⎸⎮⎮',
    '⎸⎮⎮⎮⎸⎮|⎹⎸⎮⎸⎮⎸⎮⎸∥⎮⎸⎮⎸⎮⎮',
    '⎸⎮⎮⎮⎸⎮⎸|⎹⎸⎮⎸⎮⎸∥⎮⎸⎮⎸⎮⎮⎮',
    '⎸⎮⎮⎮⎸⎮⎸⎮|⎹⎸⎮∥⎸⎮⎸⎮⎸⎮⎮⎮',
    '⎸⎮⎮⎮⎸⎮⎸⎮⎸|⎹∥⎮⎸⎮⎸⎮⎸⎮⎮⎮',
    '⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮|∥⎹⎸⎮⎸⎮⎸⎮⎮⎮',
    '⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸|⎹∥⎸⎮⎸⎮⎮⎮⎸',
    '⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮|⎹∥⎸⎮⎮⎮⎸⎮',
    '⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸|⎹∥⎮⎮⎮⎸⎮',
    '⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮|⎹∥⎮⎮⎸⎮',
    '⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸|⎹∥⎮⎸⎮'
  ],
  
  searching: [
    '🔍 Searching',
    '🔍 Searching.',
    '🔍 Searching..',
    '🔍 Searching...'
  ],
  
  downloading: [
    '⏳ Downloading',
    '⏳ Downloading.',
    '⏳ Downloading..',
    '⏳ Downloading...'
  ],
  
  processing: [
    '⚙️ Processing',
    '⚙️ Processing.',
    '⚙️ Processing..',
    '⚙️ Processing...'
  ],
  
  uploading: [
    '📤 Uploading',
    '📤 Uploading.',
    '📤 Uploading..',
    '📤 Uploading...'
  ]
};

// ==========================================
// TEXT CONTENT
// ==========================================
const BotTexts = {
  intro: `👋 HI, I'M MINIMALIST 1.0

A smart Telegram bot by the CIARA TEAM INC.
Your all-in-one media assistant.`,

  welcome: `*🕸MINIMALIST 1.0 ⏍*
「Your Smart Telegram Assistant」

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥
             *ᵈᵉᵛᵉˡᵒᵖᵉᵈ ᵇʸ ᶜʳᵃⁱᵍᵉᵉˣ* 「${config.contact.website} 」   
 ⍆─────────────⍅

What I Can Do:
⎸ 🎵 Download Songs (MP3)
⎸ 🎬 Download Videos (MP4)
⎸ 📝 Get Song Lyrics
⎸ 🎧 Identify Music (Shazam)
⎸ 🔍 Search with .yts [query]
⎸ 📊 Daily Statistics Updates

Just type a song or video name to begin.`,

  searching: `*🕸MINIMALIST 1.0 ⏍*

⎸ 🔍 Searching...

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥`,

  downloading: `*🕸MINIMALIST 1.0 ⏍*

⎸ ⏳ Downloading...

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥`,

  processing: `*🕸MINIMALIST 1.0 ⏍*

⎸ ⚙️ Processing...

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥`,

  identifying: `*🕸MINIMALIST 1.0 ⏍*

⎸ 🎧 Identifying music...

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥`,

  fetchingLyrics: `*🕸MINIMALIST 1.0 ⏍*

⎸ 📝 Fetching lyrics...

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥`,

  errors: {
    noResults: `*🕸MINIMALIST 1.0 ⏍*

❌ No results found

Try:
• Different keywords
• Full song/video title
• Artist name + title`,
    
    searchError: `*🕸MINIMALIST 1.0 ⏍*

❌ Search error occurred

Please try again.`,
    
    downloadFailed: `*🕸MINIMALIST 1.0 ⏍*

❌ Download failed

Please try again or try a different video.`,
    
    expired: `*🕸MINIMALIST 1.0 ⏍*

❌ Session expired

Please search again.`,
    
    notYours: `*🕸MINIMALIST 1.0 ⏍*

❌ This is not your download session.`,
    
    shazamFailed: `*🕸MINIMALIST 1.0 ⏍*

❌ Could not identify music

Please try:
• A clearer audio
• Music with vocals
• Popular/well-known songs`,

    noAudio: `*🕸MINIMALIST 1.0 ⏍*

❌ Please reply to an audio or video message

I need an audio file to identify the music.`,

    lyricsNotFound: `*🕸MINIMALIST 1.0 ⏍*

❌ Lyrics not found

The song lyrics may not be available.`,

    lyricsFailed: `*🕸MINIMALIST 1.0 ⏍*

❌ Failed to fetch lyrics

Please try again later.`
  }
};

// ==========================================
// KEYBOARD LAYOUTS
// ==========================================
const Keyboards = {
  start: {
    inline_keyboard: [
      [{ text: "🚀 Get Started", callback_data: "get_started" }],
      [{ text: "📞 Contact Developer", callback_data: "contact_dev" }]
    ]
  },

  contactDev: {
    inline_keyboard: [
      [{ text: "📧 Email", url: `mailto:${config.contact.email}` }],
      [{ text: "💬 WhatsApp", url: `https://wa.me/${config.contact.whatsapp.replace(/[^0-9]/g, '')}` }],
      [{ text: "🌐 Website", url: `https://${config.contact.website}` }],
      [{ text: "🔙 Back", callback_data: "back_to_start" }]
    ]
  },

  formatSelection: (userId) => ({
    inline_keyboard: [
      [
        { text: "🎵 AUDIO", callback_data: `format_audio_${userId}` },
        { text: "🎬 VIDEO", callback_data: `format_video_${userId}` }
      ],
      [
        { text: "📝 LYRICS", callback_data: `format_lyrics_${userId}` }
      ]
    ]
  }),

  // Note: These quality numbers match the ytmax API formats
  videoQuality: (userId) => ({
    inline_keyboard: [
      [{ text: "360p (Low Quality)", callback_data: `quality_360_${userId}` }],
      [{ text: "480p (Standard Quality)", callback_data: `quality_480_${userId}` }],
      [{ text: "720p (High Definition)", callback_data: `quality_720_${userId}` }],
      [{ text: "1080p (Full High Definition)", callback_data: `quality_1080_${userId}` }]
    ]
  }),

  shazamDownload: (userId) => ({
    inline_keyboard: [
      [
        { text: "✅ DOWNLOAD", callback_data: `shazam_yes_${userId}` },
        { text: "❌ CANCEL", callback_data: `shazam_no_${userId}` }
      ]
    ]
  }),

  ytsSelect: (videos, startIndex = 0) => {
    const buttons = [];
    const endIndex = Math.min(startIndex + 10, videos.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      buttons.push([{
        text: `${i + 1}. ${videos[i].title.substring(0, 50)}...`,
        callback_data: `yts_select_${i}`
      }]);
    }
    
    return { inline_keyboard: buttons };
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Animated loading helper
async function animateLoading(ctx, chatId, messageId, text, animationType = 'wave') {
  const frames = LoadingAnimations[animationType];
  let currentFrame = 0;
  
  const interval = setInterval(async () => {
    try {
      const animatedBar = LoadingAnimations.wave[currentFrame % LoadingAnimations.wave.length];
      const fullText = `*🕸MINIMALIST 1.0 ⏍*

⎸ ${text}

  ᢰ ${animatedBar}`;
      
      await ctx.telegram.editMessageText(
        chatId,
        messageId,
        null,
        fullText,
        { parse_mode: 'Markdown' }
      );
      
      currentFrame++;
    } catch (error) {
      // Ignore edit errors
    }
  }, 200);
  
  return interval;
}

// Save user
function saveUser(ctx) {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || 'No username';
    const firstName = ctx.from.first_name || 'Unknown';
    const lastName = ctx.from.last_name || '';

    if (!botUsers.has(userId)) {
      botUsers.set(userId, {
        id: userId,
        username: username,
        name: `${firstName} ${lastName}`.trim(),
        firstSeen: new Date(),
        lastActive: new Date(),
        downloads: { audio: 0, video: 0 }
      });
      logger.info(`New user: ${username} (${userId})`);
    } else {
      const user = botUsers.get(userId);
      user.lastActive = new Date();
      botUsers.set(userId, user);
    }

    if (username === config.adminUsername && !config.adminChatId) {
      config.adminChatId = ctx.chat.id;
      logger.info(`Admin chat ID set: ${ctx.chat.id}`);
    }
  } catch (error) {
    logger.error('Error saving user:', error);
  }
}

// Track download
function trackDownload(type, title, userId) {
  try {
    downloadStats.total++;
    const stat = downloadStats[type];
    stat.set(title, (stat.get(title) || 0) + 1);
    
    if (botUsers.has(userId)) {
      const user = botUsers.get(userId);
      user.downloads[type]++;
      botUsers.set(userId, user);
    }
  } catch (error) {
    logger.error('Error tracking download:', error);
  }
}

// Send temp message
async function sendTemp(ctx, text, delay = null) {
  try {
    const msg = await ctx.reply(text, { parse_mode: 'Markdown' });
    if (delay) {
      setTimeout(async () => {
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id);
        } catch (error) {
          // Ignore
        }
      }, delay);
    }
    return msg;
  } catch (error) {
    logger.error('Send temp error:', error);
  }
}

// Format song info
function formatSongInfo(songData) {
  const formattedViews = songData.views ? songData.views.toLocaleString() : 'N/A';
  
  return `*🕸MINIMALIST 1.0 ⏍*
「Media Information」

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥
             *ᵈᵉᵛᵉˡᵒᵖᵉᵈ ᵇʸ ᶜʳᵃⁱᵍᵉᵉˣ* 「${config.contact.website} 」   
 ⍆─────────────⍅

⎸ Title: ${songData.title}
⎸ Artist: ${songData.author}
⎸ Duration: ${songData.duration}
⎸ Views: ${formattedViews}
⎸ Uploaded: ${songData.uploaded}

Select format below:`;
}

// Format video quality info
function formatVideoQuality(songData) {
  return `*🕸MINIMALIST 1.0 ⏍*
「Select Video Quality」

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥
             *ᵈᵉᵛᵉˡᵒᵖᵉᵈ ᵇʸ ᶜʳᵃⁱᵍᵉᵉˣ* 「${config.contact.website} 」   
 ⍆─────────────⍅

⎸ Title: ${songData.title}
⎸ Duration: ${songData.duration}

Choose your preferred quality:`;
}

// Format shazam result
function formatShazamResult(musicData) {
  let text = `*🕸MINIMALIST 1.0 ⏍*
「Music Identified」

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥
             *ᵈᵉᵛᵉˡᵒᵖᵉᵈ ᵇʸ ᶜʳᵃⁱᵍᵉᵉˣ* 「${config.contact.website} 」   
 ⍆─────────────⍅

⎸ Title: ${musicData.title || 'Unknown'}
`;

  if (musicData.artists && musicData.artists.length > 0) {
    text += `⎸ Artist: ${musicData.artists.map(a => a.name).join(', ')}\n`;
  }
  
  if (musicData.album && musicData.album.name) {
    text += `⎸ Album: ${musicData.album.name}\n`;
  }
  
  if (musicData.genres && musicData.genres.length > 0) {
    text += `⎸ Genre: ${musicData.genres.map(g => g.name).join(', ')}\n`;
  }
  
  if (musicData.release_date) {
    text += `⎸ Released: ${musicData.release_date}\n`;
  }

  text += `\nWould you like to download this track?`;
  
  return text;
}

// Format lyrics
function formatLyrics(title, artist, lyrics) {
  const truncatedLyrics = lyrics.split('\n').slice(0, 40).join('\n');
  
  return `*🕸MINIMALIST 1.0 ⏍*
「Song Lyrics」

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥
             *ᵈᵉᵛᵉˡᵒᵖᵉᵈ ᵇʸ ᶜʳᵃⁱᵍᵉᵉˣ* 「${config.contact.website} 」   
 ⍆─────────────⍅

⎸ 🎵 Title: ${title}
⎸ 🎤 Artist: ${artist}

📝 *Lyrics*:

${truncatedLyrics}

${lyrics.split('\n').length > 40 ? '...(truncated)' : ''}`;
}

// ==========================================
// API FUNCTIONS
// ==========================================

// Search YouTube with yt-search
async function searchYouTube(query) {
  try {
    logger.info(`Searching: ${query}`);
    const searchResult = await yts(query);
    
    if (!searchResult || !searchResult.videos || searchResult.videos.length === 0) {
      logger.warn(`No results: ${query}`);
      return null;
    }

    const videos = searchResult.videos.map(video => ({
      title: video.title,
      author: video.author.name,
      url: video.url,
      thumbnail: video.thumbnail,
      duration: video.timestamp,
      views: video.views,
      uploaded: video.ago
    }));

    logger.info(`Found: ${videos.length} results`);
    return videos;
  } catch (error) {
    logger.error('Search error:', error);
    throw error;
  }
}

// Download audio with ytmax API
async function downloadAudio(url) {
  try {
    logger.info(`Downloading audio: ${url}`);
    // 💡 Use the unified ytmax API with format=mp3
    const apiUrl = `${config.apis.ytmax}?url=${encodeURIComponent(url)}&format=mp3`; 
    
    const response = await axios.get(apiUrl, { timeout: 60000 });

    if (!response.data || !response.data.result) {
      throw new Error('API failed to return audio data or invalid response structure');
    }

    // Assuming the API returns keys like title and one of the link properties
    const result = response.data.result;
    const finalDownloadUrl = result.downloadUrl || result.download_url || result.link;
    const finalTitle = result.title;
    
    if (!finalDownloadUrl) {
      throw new Error('No download URL found in API response');
    }

    logger.info(`Got download URL: ${finalTitle}`);
    return {
      title: finalTitle,
      downloadUrl: finalDownloadUrl
    };
  } catch (error) {
    logger.error('Audio download error:', error);
    throw error;
  }
}

// Download video with ytmax API
async function downloadVideo(url, quality = '720') {
  try {
    logger.info(`Downloading video: ${url} (${quality}p)`);
    // 💡 Use the unified ytmax API with quality as the format
    const apiUrl = `${config.apis.ytmax}?url=${encodeURIComponent(url)}&format=${quality}`; 
    
    const response = await axios.get(apiUrl, { timeout: 90000 });

    if (!response.data || !response.data.result) {
      throw new Error('API failed to return video data or invalid response structure');
    }

    // Assuming the API returns keys like title and one of the link properties
    const result = response.data.result;
    const finalDownloadUrl = result.downloadUrl || result.download_url || result.link;
    const finalTitle = result.title;

    if (!finalDownloadUrl) {
      throw new Error('No download URL found in API response');
    }

    logger.info(`Got video URL: ${finalTitle}`);
    return {
      title: finalTitle,
      downloadUrl: finalDownloadUrl
    };
  } catch (error) {
    logger.error('Video download error:', error);
    throw error;
  }
}

// Fetch lyrics
async function fetchLyrics(songTitle) {
  try {
    logger.info(`Fetching lyrics: ${songTitle}`);
    const apiUrl = `${config.apis.lyrics}?title=${encodeURIComponent(songTitle)}`;
    
    const response = await axios.get(apiUrl, { timeout: 30000 });

    if (!response.data || !response.data.lyrics) {
      logger.warn(`No lyrics found: ${songTitle}`);
      return null;
    }

    logger.info(`Lyrics found: ${response.data.title}`);
    return {
      title: response.data.title || songTitle,
      artist: response.data.author || 'Unknown',
      lyrics: response.data.lyrics
    };
  } catch (error) {
    logger.error('Lyrics fetch error:', error);
    throw error;
  }
}

// Shazam identify
async function identifyMusic(filePath) {
  try {
    const acr = new acrcloud(config.acrcloud);
    const buffer = await fs.readFile(filePath);
    
    const MAX_SIZE = 1 * 1024 * 1024;
    const audioBuffer = buffer.length > MAX_SIZE ? buffer.slice(0, MAX_SIZE) : buffer;
    
    const { status, metadata } = await acr.identify(audioBuffer);
    
    if (status.code !== 0 || !metadata?.music?.[0]) {
      return null;
    }

    return metadata.music[0];
  } catch (error) {
    logger.error('Shazam error:', error);
    throw error;
  }
}

// ==========================================
// BOT INITIALIZATION
// ==========================================
const bot = new Telegraf(config.botToken);

// ==========================================
// COMMAND HANDLERS
// ==========================================

// /start
bot.start(async (ctx) => {
  try {
    saveUser(ctx);
    
    const introMsg = await ctx.reply(BotTexts.intro, { parse_mode: 'Markdown' });
    
    setTimeout(async () => {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, introMsg.message_id);
        await ctx.reply(BotTexts.welcome, {
          reply_markup: Keyboards.start,
          parse_mode: 'Markdown'
        });
      } catch (error) {
        logger.error('Intro animation error:', error);
      }
    }, 2000);

    logger.info(`Start: ${ctx.from.username || ctx.from.id}`);
  } catch (error) {
    logger.error('Start error:', error);
  }
});

// .restart (Admin only)
bot.command('restart', async (ctx) => {
  try {
    if (ctx.from.username !== config.adminUsername) {
      return;
    }

    await ctx.reply('*🕸MINIMALIST 1.0 ⏍*\n\n⚠️ Restarting bot...', { parse_mode: 'Markdown' });
    logger.info('Bot restart requested by admin');
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    logger.error('Restart error:', error);
  }
});

// .yts [query] - Search with results
bot.hears(/^\.yts\s+(.+)/, async (ctx) => {
  try {
    saveUser(ctx);
    const query = ctx.match[1];
    
    const searchMsg = await ctx.reply(BotTexts.searching, { parse_mode: 'Markdown' });
    const loadingInterval = await animateLoading(ctx, ctx.chat.id, searchMsg.message_id, '🔍 Searching');
    
    const videos = await searchYouTube(query);
    
    clearInterval(loadingInterval);
    
    if (!videos || videos.length === 0) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        searchMsg.message_id,
        null,
        BotTexts.errors.noResults,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    pendingDownloads.set(ctx.from.id, {
      videos: videos,
      timestamp: Date.now()
    });

    await ctx.telegram.deleteMessage(ctx.chat.id, searchMsg.message_id);

    const resultText = `*🕸MINIMALIST 1.0 ⏍*
「Search Results」

Found ${videos.length} results for: *${query}*

Select a video below:`;

    await ctx.reply(resultText, {
      reply_markup: Keyboards.ytsSelect(videos),
      parse_mode: 'Markdown'
    });

    logger.info(`YTS search: ${query} - ${videos.length} results`);
  } catch (error) {
    logger.error('YTS error:', error);
    await ctx.reply(BotTexts.errors.searchError, { parse_mode: 'Markdown' });
  }
});

// ==========================================
// CALLBACK HANDLERS
// ==========================================

// Get started
bot.action('get_started', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.reply(
      '*🕸MINIMALIST 1.0 ⏍*\n\n✅ Ready to go!\n\nJust type any song or video name to begin.',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    logger.error('Get started error:', error);
  }
});

// Contact developer
bot.action('contact_dev', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    const contactText = `*🕸MINIMALIST 1.0 ⏍*
「Developer Contact」

  ᢰ ⎸|⎹⎮⎸⎮⎮⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮⎸⎮∥
             *ᵈᵉᵛᵉˡᵒᵖᵉᵈ ᵇʸ ᶜʳᵃⁱᵍᵉᵉˣ* 「${config.contact.website} 」   
 ⍆─────────────⍅

CIARA TEAM INC

📧 Email: ${config.contact.email}
💬 WhatsApp: ${config.contact.whatsapp}
🌐 Website: ${config.contact.website}

Choose contact method below:`;

    await ctx.editMessageText(contactText, {
      
