const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');


const token = '7794517010:AAGwNbceU7vv1oHhYo3HivctxWJtAObMgrg';
const aqicnToken = '76211e9aa7342affdb0fdbb42e62a6af5ed9842b';

const bot = new TelegramBot(token, { polling: true });

let stats = {
  totalMessages: 0,
  totalLocations: 0,
  totalErrors: 0,
};

let userLanguage = {};

const languages = {
  uz: {
    start: "Assalomu alaykum! 🌟 Tilni tanlang:",
    locationRequest: "📍 Iltimos, lokatsiya yuboring.",
    aqiMessage: (aqi, temp, message) => `🌬️ AQI: ${aqi}. 🌡️ Harorat: ${temp}°C. ${message}`,
    errors: {
      aqiFetchError: "❌ Havoni sifatini aniqlashda xatolik yuz berdi."
    },
    stats: (stats) => `
      📊 Bot statistikasi:
      - Jami xabarlar: ${stats.totalMessages}
      - Jami lokatsiyalar: ${stats.totalLocations}
      - Jami xatoliklar: ${stats.totalErrors}
    `,
    aqiMessages: [
      'Havo ochiq, maska taqishingiz kerak emas. 😊',
      'Havo biroz iflos, maska taqish tavsiya etiladi. 😷',
      'Iltimos, maska taqishni unutmang. Havo juda iflos. 😷'
    ]
  },
  ru: {
    start: "Здравствуйте! 🌟 Пожалуйста, выберите язык:",
    locationRequest: "📍 Пожалуйста, отправьте свое местоположение.",
    aqiMessage: (aqi, temp, message) => `🌬️ AQI: ${aqi}. 🌡️ Температура: ${temp}°C. ${message}`,
    errors: {
      aqiFetchError: "❌ Произошла ошибка при определении качества воздуха."
    },
    stats: (stats) => `
      📊 Статистика бота:
      - Всего сообщений: ${stats.totalMessages}
      - Всего местоположений: ${stats.totalLocations}
      - Всего ошибок: ${stats.totalErrors}
    `,
    aqiMessages: [
      'Воздух чистый, вам не нужно носить маску. 😊',
      'Воздух немного загрязнен, рекомендуется носить маску. 😷',
      'Пожалуйста, не забудьте надеть маску. Воздух очень загрязнен. 😷'
    ]
  },
  en: {
    start: "Hello! 🌟 Please select a language:",
    locationRequest: "📍 Please send your location.",
    aqiMessage: (aqi, temp, message) => `🌬️ AQI: ${aqi}. 🌡️ Temperature: ${temp}°C. ${message}`,
    errors: {
      aqiFetchError: "❌ An error occurred while determining air quality."
    },
    stats: (stats) => `
      📊 Bot statistics:
      - Total messages: ${stats.totalMessages}
      - Total locations: ${stats.totalLocations}
      - Total errors: ${stats.totalErrors}
    `,
    aqiMessages: [
      'The air is clean, no need to wear a mask. 😊',
      'The air is slightly polluted, wearing a mask is recommended. 😷',
      'Please don\'t forget to wear a mask. The air is very polluted. 😷'
    ]
  }
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'O‘zbekcha 🇺🇿', callback_data: 'uz' },
          { text: 'Русский 🇷🇺', callback_data: 'ru' },
          { text: 'English 🇬🇧', callback_data: 'en' }
        ]
      ]
    }
  };
  bot.sendMessage(chatId, 'Assalomu alaykum! 🌟 Tilni tanlang:', opts);
});

bot.on('callback_query', (callbackQuery) => {
  const { data } = callbackQuery;
  const chatId = callbackQuery.message.chat.id;
  userLanguage[chatId] = data;
  bot.sendMessage(chatId, languages[data].locationRequest);
});

bot.on('location', (msg) => {
  const chatId = msg.chat.id;
  const { latitude, longitude } = msg.location;
  const lang = userLanguage[chatId] || 'uz';

  axios.get(`https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=${aqicnToken}`)
    .then(response => {
      const data = response.data.data;
      const aqi = data.aqi;
      const temp = data.iaqi.t ? data.iaqi.t.v : 'Noma\'lum';

      let message;

      if (aqi < 50) {
        message = languages[lang].aqiMessages[0];
      } else if (aqi >= 50 && aqi <= 100) {
        message = languages[lang].aqiMessages[1];
      } else if (aqi > 100) {
        message = languages[lang].aqiMessages[2];
      }

      bot.sendMessage(chatId, languages[lang].aqiMessage(aqi, temp, message));
      stats.totalLocations += 1;
    })
    .catch(error => {
      bot.sendMessage(chatId, languages[lang].errors.aqiFetchError);
      console.error(error);
      stats.totalErrors += 1;
    });
});

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  stats.totalMessages += 1;
  if (!msg.location && !msg.text.startsWith('/')) {
    const lang = userLanguage[chatId] || 'uz';
    bot.sendMessage(chatId, languages[lang].locationRequest);
  }
});

bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const lang = userLanguage[chatId] || 'uz';
  bot.sendMessage(chatId, languages[lang].stats(stats));
});

console.log('Bot ishga tushirildi');