import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
import os
import glob
import yt_dlp

BOT_TOKEN = ""
bot = telebot.TeleBot(BOT_TOKEN)
API_KEY = "gifted"
BASE_API_URL = "https://api.giftedtech.co.ke/api"

DOWNLOAD_DIR = "downloads"
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

pending_music_search = {}

# ==================== MUSIC & DOWNLOAD FUNCTIONS ====================

def search_youtube_music(query):
    """Search for music on YouTube - returns only the best match"""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': 'in_playlist',
            'cookiefile': 'cookies.txt',
        }

        search_url = f"https://www.youtube.com/results?search_query={query}"

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            results = ydl.extract_info(search_url, download=False)

            if results and 'entries' in results:
                tracks = []
                for entry in results['entries'][:1]:
                    if entry.get('title'):
                        tracks.append({
                            'id': entry.get('id'),
                            'title': entry.get('title', 'Unknown'),
                            'url': f"https://www.youtube.com/watch?v={entry.get('id')}",
                            'duration': entry.get('duration', 0),
                            'uploader': entry.get('uploader', 'Unknown'),
                        })
                return tracks
        return None
    except Exception as e:
        print(f"Search error: {e}")
        return None

def get_music_metadata(url):
    """Get detailed metadata from YouTube video"""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'cookiefile': 'cookies.txt',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'Unknown'),
                'view_count': info.get('view_count', 0),
                'upload_date': info.get('upload_date', ''),
                'thumbnail': info.get('thumbnail', ''),
            }
    except Exception as e:
        print(f"Metadata error: {e}")
        return None

def download_youtube_music(url):
    """Download music from YouTube using yt-dlp"""
    try:
        # Clean old files
        for f in glob.glob(f"{DOWNLOAD_DIR}/*.mp3"):
            try:
                os.remove(f)
            except:
                pass

        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
            'outtmpl': f'{DOWNLOAD_DIR}/%(title)s.%(ext)s',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
            'socket_timeout': 30,
            'cookiefile': 'cookies.txt',
            'ignoreerrors': False,
            'retries': 3,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get('title', 'Music') if info else 'Music'

            mp3_files = glob.glob(f"{DOWNLOAD_DIR}/*.mp3")
            if mp3_files:
                file_size = os.path.getsize(mp3_files[0])
                return mp3_files[0], title, file_size

        return None, "Download completed but file not found", 0
    except Exception as e:
        return None, f"Error: {str(e)}", 0

def format_duration(seconds):
    """Convert seconds to MM:SS format"""
    if not seconds:
        return "0:00"
    mins = seconds // 60
    secs = seconds % 60
    return f"{mins}:{secs:02d}"

def format_filesize(bytes_size):
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024:
            return f"{bytes_size:.1f} {unit}"
        bytes_size /= 1024
    return f"{bytes_size:.1f} TB"

def format_date(date_str):
    """Format YouTube date (YYYYMMDD) to readable format"""
    if not date_str or len(date_str) < 8:
        return "Unknown"
    try:
        year = date_str[:4]
        month = date_str[4:6]
        day = date_str[6:8]
        return f"{day}/{month}/{year}"
    except:
        return "Unknown"

def format_views(count):
    """Format view count"""
    if not count:
        return "0"
    if count >= 1_000_000:
        return f"{count / 1_000_000:.1f}M"
    elif count >= 1_000:
        return f"{count / 1_000:.1f}K"
    return str(count)

# ==================== HANDLERS ====================

@bot.message_handler(commands=['start'])
def send_welcome(message):
    chat_id = message.chat.id
    username = message.from_user.first_name or message.from_user.username or "User"

    welcome_text = (
        f"<b>Welcome @{username}!</b> 🎵\n\n"
        f"Welcome to <b>∞AUDIOALLLY∞ ♫</b>\n\n"
        f"<b>What I Do:</b>\n"
        f"✨ I help you download high-quality music\n"
        f"🔍 Just type the song name or artist name\n"
        f"⬇️ I'll find it and prepare it for download\n\n"
        f"<b>How to Use:</b>\n"
        f"1️⃣ Type a song name (e.g., 'Shape of You')\n"
        f"2️⃣ I'll search and show you results\n"
        f"3️⃣ Click the download button\n"
        f"4️⃣ Get your audio file instantly!\n\n"
        f"Get high-quality audio from <b>∞AUDIOALLLY∞ ♫</b> 🎧"
    )

    bot.send_message(chat_id, welcome_text, parse_mode="html")

@bot.message_handler(func=lambda message: message.text.lower() in ["hi", "hie", "hello", "wassup"])
def send_greeting(message):
    chat_id = message.chat.id
    username = message.from_user.first_name or message.from_user.username or "User"
    greeting_text = f"<b>Welcome {username}!</b> 👋 Type a song name to search for music! 🎵"
    bot.send_message(chat_id, greeting_text, parse_mode="html")

@bot.message_handler(content_types=['text'])
def get_user_text(message):
    text = message.text.strip()
    text_lower = text.lower()
    user_id = message.from_user.id
    chat_id = message.chat.id
    username = message.from_user.first_name or message.from_user.username or "User"

    # Ignore very short queries
    if len(text_lower) < 2:
        bot.send_message(
            chat_id,
            f"<b>{username}</b>, please provide a valid song name! 🎵\nExample: Shape of You",
            parse_mode="html"
        )
        return

    query = text_lower
    searching_msg = bot.send_message(
        chat_id,
        f"<b>{username}</b>, searching for: <b>{query}</b>... 🔍",
        parse_mode='html'
    )

    results = search_youtube_music(query)

    if results and len(results) > 0:
        track = results[0]
        pending_music_search[user_id] = results
        
        track_url = track.get('url')
        track_title = track.get('title', 'Unknown')

        # Edit message while getting metadata
        bot.edit_message_text(
            f"<b>{username}</b>, getting details for <b>{track_title}</b>... ⏳",
            chat_id=chat_id,
            message_id=searching_msg.message_id,
            parse_mode='html'
        )

        # Get metadata for the song
        metadata = get_music_metadata(track_url)

        if not metadata:
            bot.edit_message_text(
                f"<b>{username}</b> ❌ Could not get song details. Try another search!",
                chat_id=chat_id,
                message_id=searching_msg.message_id,
                parse_mode='html'
            )
            return

        # Create song info with full metadata
        duration = format_duration(metadata['duration'])
        views = format_views(metadata['view_count'])
        upload_date = format_date(metadata['upload_date'])
        thumbnail_url = metadata['thumbnail']

        info_text = (
            f"<b>🎵 {metadata['title']}</b>\n\n"
            f"👤 <b>Artist:</b> {metadata['uploader']}\n"
            f"⏱️ <b>Duration:</b> {duration}\n"
            f"👁️ <b>Views:</b> {views}\n"
            f"📅 <b>Uploaded:</b> {upload_date}\n\n"
            f"<i>Click the button below to download this song!</i>"
        )

        # Create download button
        download_markup = InlineKeyboardMarkup()
        download_button = InlineKeyboardButton(
            "⬇️ Download Music",
            callback_data=f"download_0"
        )
        download_markup.add(download_button)

        # Send message with thumbnail
        if thumbnail_url:
            try:
                bot.send_photo(
                    chat_id,
                    thumbnail_url,
                    caption=info_text,
                    parse_mode='html',
                    reply_markup=download_markup
                )
            except Exception as e:
                print(f"Photo send error: {e}")
                bot.send_message(
                    chat_id,
                    info_text,
                    parse_mode='html',
                    reply_markup=download_markup
                )
        else:
            bot.send_message(
                chat_id,
                info_text,
                parse_mode='html',
                reply_markup=download_markup
            )

        # Delete the searching message
        try:
            bot.delete_message(chat_id, searching_msg.message_id)
        except:
            pass
    else:
        bot.edit_message_text(
            f"<b>{username}</b> ❌ No results found. Try a different search term.",
            chat_id=chat_id,
            message_id=searching_msg.message_id,
            parse_mode='html'
        )


@bot.callback_query_handler(func=lambda call: call.data.startswith('download_'))
def handle_music_download(call):
    chat_id = call.message.chat.id
    user_id = call.from_user.id
    username = call.from_user.first_name or call.from_user.username or "User"

    try:
        choice = int(call.data.split('_')[1])

        if user_id not in pending_music_search:
            try:
                bot.answer_callback_query(call.id, "Session expired. Please search again.", show_alert=True)
            except:
                pass
            return

        selected_track = pending_music_search[user_id][choice]
        track_url = selected_track.get('url')
        track_title = selected_track.get('title', 'Unknown')

        # Answer callback first to prevent timeout errors
        try:
            bot.answer_callback_query(call.id)
        except:
            pass

        # Show downloading status
        downloading_msg = bot.send_message(
            chat_id,
            f"<b>{username}</b>, downloading <b>{track_title}</b>... ⏳",
            parse_mode='html'
        )

        file_path, title, file_size = download_youtube_music(track_url)

        if file_path and os.path.exists(file_path):
            try:
                file_size_str = format_filesize(file_size)
                with open(file_path, 'rb') as audio:
                    bot.send_audio(
                        chat_id,
                        audio,
                        title=title,
                        performer="∞AUDIOALLLY∞",
                        caption=f"<b>✅ {title}</b>\n<i>Size: {file_size_str}</i>",
                        parse_mode='html'
                    )

                # Delete the downloading message
                try:
                    bot.delete_message(chat_id, downloading_msg.message_id)
                except:
                    pass

                # Clean up
                try:
                    os.remove(file_path)
                except:
                    pass
                    
                if user_id in pending_music_search:
                    del pending_music_search[user_id]

                # Send success notification
                bot.send_message(
                    chat_id,
                    f"<b>✅ Download complete!</b> Enjoy your music! 🎵",
                    parse_mode='html'
                )

            except Exception as e:
                print(f"Send audio error: {e}")
                bot.send_message(
                    chat_id,
                    f"<b>{username}</b> ❌ Error sending audio: {str(e)}\nPlease try again!",
                    parse_mode='html'
                )
        else:
            bot.send_message(
                chat_id,
                f"<b>{username}</b> ❌ Failed to download: {title}\nTry another song!",
                parse_mode='html'
            )

    except Exception as e:
        print(f"Download error: {e}")
        try:
            bot.send_message(
                chat_id,
                f"<b>Error:</b> {str(e)}\nPlease try searching again.",
                parse_mode='html'
            )
        except:
            pass

# ==================== BOT STARTUP ====================

if __name__ == "__main__":
    if BOT_TOKEN and BOT_TOKEN != "YOUR_BOT_TOKEN_HERE":
        print("🎵 Bot started successfully!")
        bot.infinity_polling(none_stop=True)
    else:
        print("❌ Error: BOT_TOKEN not set. Please add your token in the code.")
