// commands/search/search.js - Search Commands with GiftedTech APIs

import axios from 'axios';
// Google Search Command
export const google = {
    name: 'google',
    aliases: ['search', 'gsearch'],
    category: 'search',
    description: 'Search Google',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide a search query!\n\nExample: .google nodejs tutorial');

        try {
            const query = args.join(' ');
            m.reply('🔍 Searching Google...');

            const url = `https://api.giftedtech.web.id/api/search/google?apikey=gifted&query=${encodeURIComponent(query)}`;
            const { data } = await axios.get(url);

            if (!data || !data.result || !data.result.length) 
                return m.reply('❌ No results found!');

            let resultText = `*🌐 GOOGLE SEARCH RESULTS*\n\n🔍 *Query:* ${query}\n📊 *Results:* ${data.result.length}\n\n`;

            data.result.slice(0, 5).forEach((result, index) => {
                resultText += `*${index + 1}. ${result.title}*\n`;
                resultText += `📝 ${result.description}\n`;
                resultText += `🔗 ${result.url}\n\n`;
            });

            await sock.sendMessage(m.chat, { text: resultText }, { quoted: m });
        } catch (error) {
            console.error(error);
            m.reply('❌ Error searching Google. Please try again.');
        }
    }
};

// Weather Command
export const weather = {
    name: 'weather',
    aliases: ['w', 'clima'],
    category: 'search',
    description: 'Get weather information',
    execute: async (sock, m, args) => {
        if (!args[0]) return m.reply('❌ Please provide a city name!\n\nExample: .weather London');

        try {
            const city = args.join(' ');
            m.reply('🌤️ Getting weather information...');

            const url = `https://api.giftedtech.web.id/api/search/weather?apikey=gifted&location=${encodeURIComponent(city)}`;
            const { data } = await axios.get(url);

            if (!data || !data.result) 
                return m.reply('❌ No weather data found!');

            const w = data.result;
            const weatherText = `*🌤️ WEATHER INFORMATION*\n\n📍 *Location:* ${w.location}\n🌡️ *Temperature:* ${w.temperature}\n🤔 *Feels Like:* ${w.feels_like}\n💧 *Humidity:* ${w.humidity}\n☁️ *Condition:* ${w.description}\n💨 *Wind:* ${w.wind}\n\n📅 *Updated:* ${new Date().toLocaleString()}`;

            await sock.sendMessage(m.chat, { text: weatherText }, { quoted: m });
        } catch (error) {
            console.error(error);
            m.reply('❌ Error fetching weather. Please check the city name.');
        }
    }
};