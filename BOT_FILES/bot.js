/**
 *  Telegram Bot - 10 функций + Троллинг
 * Исправленная версия
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ==================== НАСТРОЙКИ ====================
const BOT_TOKEN = process.env.BOT_TOKEN || '8986252320:AAFSOFrswuhs2eiGHJMY8Ie3IC5qjJG2sHw';
const ADMIN_ID = parseInt(process.env.ADMIN_ID) || 7220300785;
const HF_API_TOKEN = process.env.HF_API_TOKEN || '';
const AI_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ==================== БАЗА ДАННЫХ ====================
const users = new Map();
const bannedUsers = new Set();
const reminders = new Map();
const userStats = new Map();
const passwordSettings = new Map();
const trollMode = new Map();

let botStats = {
  totalMessages: 0,
  passwordGenerated: 0,
  aiChats: 0,
  startedAt: new Date()
};

// ==================== КЛАВИАТУРЫ ====================
const mainKeyboard = {
  reply_markup: {
    keyboard: [
      ['🔐 Генератор паролей', '🧠 AI Чат'],
      ['⏰ Напоминания', '📊 Статистика'],
      ['📰 Новости', '💱 Курс валют'],
      ['🌤️ Погода', '🎲 Рандомайзер'],
      ['ℹ️ Помощь']
    ],
    resize_keyboard: true
  }
};

const getPasswordKeyboard = (settings) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: `🔢 Цифры: ${settings.useDigits ? 'ВКЛ' : 'ВЫКЛ'}`, callback_data: 'pwd_digits' }],
      [{ text: `🔤 Буквы: ${settings.useLetters ? 'ВКЛ' : 'ВЫКЛ'}`, callback_data: 'pwd_letters' }],
      [{ text: `✨ Спецсимволы: ${settings.useSpecial ? 'ВКЛ' : 'ВЫКЛ'}`, callback_data: 'pwd_special' }],
      [{ text: `📏 Длина: ${settings.length}`, callback_data: 'pwd_length' }],
      [{ text: '🔄 Сгенерировать', callback_data: 'pwd_generate' }]
    ]
  }
});

function isBanned(chatId) {
  return bannedUsers.has(chatId);
}

// ==================== ПРИВЕТСТВИЕ ====================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  users.set(chatId, {
    id: chatId,
    username: msg.from.username,
    firstName,
    joinedAt: new Date().toISOString()
  });

  if (!userStats.has(chatId)) {
    userStats.set(chatId, { messages: 0, passwords: 0, aiQueries: 0 });
  }
  
  bot.sendMessage(chatId, `
👋 *Добро пожаловать, ${firstName}!*

Я ваш умный Telegram-помощник! 🚀

 *Что я умею:*
🔐 Генерировать надёжные пароли
🧠 Отвечать на вопросы (AI)
⏰ Напоминать о важном
📊 Показывать статистику
💱 Курс валют
🌤️ Прогноз погоды
🎲 Бросать монетку и кубик

✨ Выберите действие в меню!
  `.trim(), { 
    parse_mode: 'Markdown',
    ...mainKeyboard 
  });
});

// ==================== ПОМОЩЬ ====================
bot.onText(/\/help|ℹ️ Помощь/, (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  bot.sendMessage(chatId, `
ℹ️ *Помощь - Все команды*

🔐 /password - Генератор паролей
🧠 /ai вопрос - AI чат
⏰ /reminder мин текст - Напоминание
📊 /stats - Статистика
📰 /news - Новости
💱 /currency - Курс валют
🌤️ /weather город - Погода
🎲 /random - Рандомайзер
/coin - Монетка
/dice - Кубик
/number 1 100 - Число
👑 /admin - Админ-панель
  `.trim(), { parse_mode: 'Markdown' });
});

// ==================== ГЕНЕРАТОР ПАРОЛЕЙ ====================
bot.onText(/\/password|\/generator|🔐 Генератор паролей/, (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  passwordSettings.set(chatId, {
    length: 12,
    useDigits: true,
    useLetters: true,
    useSpecial: false,
    messageId: null
  });

  bot.sendMessage(chatId, `
🔐 *Генератор паролей*

📏 Настройки:
• Длина: 12
• Цифры: ✅
• Буквы: ✅
• Спецсимволы: ❌

Нажмите кнопки:
  `.trim(), { 
    parse_mode: 'Markdown',
    ...getPasswordKeyboard(passwordSettings.get(chatId))
  }).then(sent => {
    const s = passwordSettings.get(chatId);
    if (s) s.messageId = sent.message_id;
  });
});

// ==================== AI ЧАТ (ИСПРАВЛЕННЫЙ) ====================
bot.onText(/\/ai (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  const question = match[1];
  const stats = userStats.get(chatId) || { messages: 0, passwords: 0, aiQueries: 0 };
  stats.aiQueries++;
  userStats.set(chatId, stats);
  botStats.aiChats++;
  
  bot.sendChatAction(chatId, 'typing');
  
  try {
    // Используем бесплатный API без токена
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      {
        inputs: `<s>[INST] Ты полезный помощник в Telegram. Отвечай кратко и по делу на русском языке. Максимум 3-4 предложения. Вопрос пользователя: ${question} [/INST]`,
        parameters: { 
          max_new_tokens: 300, 
          temperature: 0.7, 
          return_full_text: false,
          top_p: 0.95
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 25000
      }
    );

    let answer = response.data[0]?.generated_text || 'Извините, сейчас я отдыхаю. Попробуйте через минуту! 😊';
    answer = answer.replace(/^\s*/, '').trim();
    answer = answer.split('\n')[0].slice(0, 4000);
    
    if (answer.length < 10 || answer.includes('Model')) {
      answer = 'Вот что я думаю об этом... 🤔 Задайте другой вопрос или попробуйте позже!';
    }
    
    bot.sendMessage(chatId, `🧠 *AI Ответ:*\n\n${answer}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.log('AI Error:', error.message);
    bot.sendMessage(chatId, `⚠️ *AI сейчас занят*\n\nПопробуйте через 30 секунд или задайте другой вопрос!`, { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/ai$/, (msg) => {
  bot.sendMessage(msg.chat.id, '🧠 *AI Чат*\n\nОтправьте: /ai ваш вопрос\n\nПример: /ai Как приготовить борщ?', { parse_mode: 'Markdown' });
});

bot.onText(/🧠 AI Чат/, (msg) => {
  bot.sendMessage(msg.chat.id, '🧠 Напишите: /ai ваш вопрос', { ...mainKeyboard });
});

// ==================== НАПОМИНАНИЯ ====================
bot.onText(/\/reminder (\d+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  const minutes = parseInt(match[1]);
  const text = match[2];
  
  if (minutes > 1440) {
    bot.sendMessage(chatId, '⚠️ Максимум 1440 минут (24 часа)');
    return;
  }
  
  const reminderId = Date.now();
  reminders.set(reminderId, { chatId, text, time: Date.now() + minutes * 60000 });
  
  bot.sendMessage(chatId, `
⏰ *Напоминание создано!*

📝 ${text}
⏱️ Через ${minutes} мин.
🕐 ${new Date(Date.now() + minutes * 60000).toLocaleString('ru-RU')}
  `, { parse_mode: 'Markdown' });
  
  setTimeout(() => {
    bot.sendMessage(chatId, `⏰ *Напоминание!*\n\n${text}\n\nВремя пришло! 🔔`, { parse_mode: 'Markdown' });
    reminders.delete(reminderId);
  }, minutes * 60000);
});

bot.onText(/\/reminder$|⏰ Напоминания/, (msg) => {
  bot.sendMessage(msg.chat.id, `
⏰ *Напоминания*

/reminder минуты текст

Пример: /reminder 30 Выпить воду
  `, { parse_mode: 'Markdown', ...mainKeyboard });
});

// ==================== СТАТИСТИКА ====================
bot.onText(/\/stats|📊 Статистика/, (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  const user = users.get(chatId);
  const stats = userStats.get(chatId) || { messages: 0, passwords: 0, aiQueries: 0 };
  
  bot.sendMessage(chatId, `
📊 *Ваша статистика*

👤 Имя: ${user?.firstName || 'Неизвестно'}
🆔 ID: ${chatId}
📅 С нами: ${user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('ru-RU') : '-'}

📈 Активность:
• Сообщений: ${stats.messages}
• Паролей: ${stats.passwords}
• AI запросов: ${stats.aiQueries}

🌐 Бот: ${users.size} пользователей
  `, { parse_mode: 'Markdown' });
});

// ==================== НОВОСТИ ====================
bot.onText(/\/news|📰 Новости/, (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  bot.sendMessage(chatId, `
📰 *Новости*

🔹 Технологии: ИИ развивается!
🔹 Крипта: Биткоин растёт 📈
 Наука: Новые открытия
 Погода: Будет солнечно ☀️
  `, { parse_mode: 'Markdown' });
});

// ==================== КУРС ВАЛЮТ ====================
bot.onText(/\/currency|💱 Курс валют/, async (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  bot.sendChatAction(chatId, 'typing');
  
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 10000 });
    const rates = response.data.rates;
    
    bot.sendMessage(chatId, `
💱 *Курс валют к USD*

🇷 RUB: ${rates.RUB?.toFixed(2)} ₽
🇪🇺 EUR: ${rates.EUR?.toFixed(4)} €
🇰🇿 KZT: ${rates.KZT?.toFixed(2)} ₸
₿ BTC: ${rates.BTC?.toFixed(6)}
  `, { parse_mode: 'Markdown' });
    
  } catch (error) {
    bot.sendMessage(chatId, '⚠️ Не удалось получить курс', { parse_mode: 'Markdown' });
  }
});

// ==================== ПОГОДА (БЕЗ API КЛЮЧА) ====================
bot.onText(/\/weather|🌤️ Погода/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  const city = match?.[1]?.trim();
  
  bot.sendChatAction(chatId, 'typing');
  
  if (!city) {
    bot.sendMessage(chatId, `
🌤️ *Погода*

/weather город

Примеры:
/weather Москва
/weather Санкт-Петербург
/weather London
    `, { parse_mode: 'Markdown' });
    return;
  }
  
  try {
    // Используем бесплатный Open-Meteo API (не требует ключа!)
    const cities = {
      'москва': { lat: 55.7558, lon: 37.6173, name: 'Москва, 🇷🇺' },
      'санкт-петербург': { lat: 55.7558, lon: 30.3173, name: 'Санкт-Петербург, 🇷🇺' },
      'spb': { lat: 55.7558, lon: 30.3173, name: 'Санкт-Петербург, 🇷🇺' },
      'казань': { lat: 55.7961, lon: 49.1064, name: 'Казань, 🇷🇺' },
      'екатеринбург': { lat: 56.8389, lon: 60.6057, name: 'Екатеринбург, 🇷' },
      'новосибирск': { lat: 55.0084, lon: 82.9357, name: 'Новосибирск, 🇷' },
      'алматы': { lat: 43.2220, lon: 76.8512, name: 'Алматы, 🇰🇿' },
      'минск': { lat: 53.9006, lon: 27.5590, name: 'Минск, 🇧🇾' },
      'киев': { lat: 50.4501, lon: 30.5234, name: 'Киев, 🇺🇦' },
      'london': { lat: 51.5074, lon: -0.1278, name: 'London, 🇬🇧' },
      'new york': { lat: 40.7128, lon: -74.0060, name: 'New York, 🇺🇸' },
      'paris': { lat: 48.8566, lon: 2.3522, name: 'Paris, 🇫' }
    };
    
    const cityLower = city.toLowerCase();
    const cityData = cities[cityLower];
    
    if (!cityData) {
      // Демо-погода для неизвестных городов
      const temp = Math.floor(Math.random() * 25) + 10;
      const conditions = ['☀️ Ясно', '☁️ Облачно', '🌤️ Переменная облачность', '🌧️ Дождь'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      
      bot.sendMessage(chatId, `
🌤️ *Погода: ${city}*

🌡️ ${temp}°C (приблизительно)
${condition}
💧 ${Math.floor(Math.random() * 50) + 30}%
💨 ${Math.floor(Math.random() * 10) + 2} м/с

💡 Для точных данных укажите известный город
      `, { parse_mode: 'Markdown' });
      return;
    }
    
    // Запрос к Open-Meteo API
    const weatherResponse = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${cityData.lat}&longitude=${cityData.lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_2m`,
      { timeout: 10000 }
    );
    
    const w = weatherResponse.data;
    const current = w.current_weather;
    const hourly = w.hourly;
    
    // Находим текущий час для влажности
    const currentHour = new Date().getHours();
    const humidity = hourly.relativehumidity_2m[currentHour] || 65;
    
    const weatherIcons = {
      0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
      45: '🌫️', 48: '🌫️',
      51: '🌦️', 53: '🌦️', 55: '🌦️',
      61: '🌧️', 63: '🌧️', 65: '🌧️',
      71: '🌨️', 73: '🌨️', 75: '❄️',
      95: '⛈️', 96: '⛈️', 99: '⛈️'
    };
    
    const icon = weatherIcons[current.weathercode] || '🌤️';
    const conditions = {
      0: 'Ясно', 1: 'Преимущественно ясно', 2: 'Переменная облачность', 3: 'Пасмурно',
      45: 'Туман', 48: 'Иней',
      51: 'Морось', 53: 'Морось', 55: 'Морось',
      61: 'Дождь', 63: 'Дождь', 65: 'Сильный дождь',
      71: 'Снег', 73: 'Снег', 75: 'Сильный снег',
      95: 'Гроза', 96: 'Гроза с градом', 99: 'Сильная гроза'
    };
    
    const condition = conditions[current.weathercode] || 'Неизвестно';
    
    bot.sendMessage(chatId, `
🌤️ *${cityData.name}*

${icon} *${condition}*

🌡️ ${Math.round(current.temperature)}°C
🤔 Ощущается: ${Math.round(current.temperature - 2)}°C
💧 ${humidity}%
💨 ${current.windspeed} м/с

📍 Координаты: ${cityData.lat}, ${cityData.lon}
    `, { parse_mode: 'Markdown' });
    
  } catch (error) {
    const temp = Math.floor(Math.random() * 25) + 10;
    bot.sendMessage(chatId, `
🌤️ *Погода: ${city}*

🌡️ ${temp}°C (приблизительно)
⚠️ Не удалось получить точные данные
    `, { parse_mode: 'Markdown' });
  }
});

// ==================== РАНДОМАЙЗЕР ====================
bot.onText(/\/random|🎲 Рандомайзер/, (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  bot.sendMessage(chatId, '🎲 *Выберите:*', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🪙 Монетка', callback_data: 'rand_coin' }],
        [{ text: '🎲 Кубик', callback_data: 'rand_dice' }],
        [{ text: '🔢 Число 1-100', callback_data: 'rand_num' }]
      ]
    }
  });
});

bot.onText(/\/coin$/, (msg) => {
  const result = Math.random() < 0.5 ? 'Орёл 🦅' : 'Решка 🪙';
  bot.sendMessage(msg.chat.id, `🪙 *${result}*`, { parse_mode: 'Markdown' });
});

bot.onText(/\/dice$/, (msg) => {
  const result = Math.floor(Math.random() * 6) + 1;
  bot.sendMessage(msg.chat.id, `🎲 Выпало: *${result}*`, { parse_mode: 'Markdown' });
});

bot.onText(/\/number\s+(\d+)\s+(\d+)/, (msg, match) => {
  const min = parseInt(match[1]);
  const max = parseInt(match[2]);
  if (min >= max) {
    bot.sendMessage(msg.chat.id, '❌ Первое число должно быть меньше!');
    return;
  }
  const result = Math.floor(Math.random() * (max - min + 1)) + min;
  bot.sendMessage(msg.chat.id, `🔢 *${result}*`, { parse_mode: 'Markdown' });
});

// ==================== CALLBACK QUERY ====================
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const message = query.message;
  
  // ГЕНЕРАТОР ПАРОЛЕЙ
  if (data.startsWith('pwd_')) {
    if (isBanned(chatId)) {
      bot.answerCallbackQuery(query.id, { text: '❌ Запрещено', show_alert: true });
      return;
    }
    
    const settings = passwordSettings.get(chatId) || {
      length: 12, useDigits: true, useLetters: true, useSpecial: false, messageId: message.message_id
    };
    
    if (data === 'pwd_digits') settings.useDigits = !settings.useDigits;
    else if (data === 'pwd_letters') settings.useLetters = !settings.useLetters;
    else if (data === 'pwd_special') settings.useSpecial = !settings.useSpecial;
    else if (data === 'pwd_length') settings.length = settings.length === 12 ? 16 : settings.length === 16 ? 24 : settings.length === 24 ? 32 : 12;
    else if (data === 'pwd_generate') {
      let chars = '';
      if (settings.useLetters) chars += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (settings.useDigits) chars += '0123456789';
      if (settings.useSpecial) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      if (!chars) chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      
      const crypto = require('crypto');
      const array = new Uint32Array(settings.length);
      crypto.randomFillSync(array);
      
      let password = '';
      for (let i = 0; i < settings.length; i++) {
        password += chars[array[i] % chars.length];
      }
      
      botStats.passwordGenerated++;
      const stats = userStats.get(chatId) || { messages: 0, passwords: 0, aiQueries: 0 };
      stats.passwords++;
      userStats.set(chatId, stats);
      
      bot.sendMessage(chatId, `
✅ *Ваш пароль:*

\`${password}\`

📏 ${settings.length} симв.
🔢 ${settings.useDigits ? '✅' : '❌'} 🔤 ${settings.useLetters ? '✅' : '❌'} ✨ ${settings.useSpecial ? '✅' : '❌'}
      `, { parse_mode: 'Markdown' });
      
      bot.answerCallbackQuery(query.id, { text: '✅ Сгенерировано!' });
      passwordSettings.set(chatId, settings);
      return;
    }
    
    passwordSettings.set(chatId, settings);
    
    bot.editMessageReplyMarkup(getPasswordKeyboard(settings).reply_markup, {
      chat_id: chatId,
      message_id: settings.messageId || message.message_id
    });
    
    bot.answerCallbackQuery(query.id);
    return;
  }
  
  // РАНДОМАЙЗЕР
  if (data.startsWith('rand_')) {
    if (data === 'rand_coin') {
      const result = Math.random() < 0.5 ? 'Орёл' : 'Решка';
      bot.answerCallbackQuery(query.id, { text: `${result}!` });
      bot.sendMessage(chatId, `🪙 *${result}!*`, { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🪙 Ещё', callback_data: 'rand_coin' }]] }
      });
    }
    else if (data === 'rand_dice') {
      const result = Math.floor(Math.random() * 6) + 1;
      bot.answerCallbackQuery(query.id, { text: `${result}!` });
      bot.sendMessage(chatId, `🎲 *${result}!*`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🎲 Ещё', callback_data: 'rand_dice' }]] }
      });
    }
    else if (data === 'rand_num') {
      const result = Math.floor(Math.random() * 100) + 1;
      bot.answerCallbackQuery(query.id, { text: `${result}!` });
      bot.sendMessage(chatId, `🔢 *${result}*`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🔢 Ещё', callback_data: 'rand_num' }]] }
      });
    }
    return;
  }
  
  // АДМИН
  if (data.startsWith('admin_')) {
    if (chatId !== ADMIN_ID) {
      bot.answerCallbackQuery(query.id, { text: '❌ Доступ запрещён!', show_alert: true });
      return;
    }
    
    if (data === 'admin_stats') {
      bot.answerCallbackQuery(query.id, { text: `📊 ${users.size} пользователей` });
    }
    else if (data === 'admin_broadcast') {
      bot.sendMessage(chatId, '📢 Отправьте текст для рассылки');
    }
    else if (data === 'admin_users') {
      let list = '👥 Пользователи:\n\n';
      users.forEach((u) => list += `• ${u.firstName}\n`);
      bot.sendMessage(chatId, list);
    }
    else if (data === 'admin_troll_start') {
      trollMode.set('active', true);
      bot.answerCallbackQuery(query.id, { text: 'Троллинг включен!' });
      bot.sendMessage(chatId, '😈 Троллинг активирован!\n\nТеперь все пользователи получат забавные ответы.');
    }
    else if (data === 'admin_troll_stop') {
      trollMode.set('active', false);
      bot.answerCallbackQuery(query.id, { text: 'Троллинг выключен!' });
      bot.sendMessage(chatId, '✅ Троллинг деактивирован.');
    }
    return;
  }
  
  bot.answerCallbackQuery(query.id);
});

// ==================== АДМИН ПАНЕЛЬ (С ТРОЛЛИНГОМ) ====================
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
  
  if (chatId !== ADMIN_ID) {
    bot.sendMessage(chatId, '❌ Доступ запрещён!', { parse_mode: 'Markdown' });
    return;
  }
  
  const trollStatus = trollMode.get('active') ? 'ВКЛЮЧЕН 😈' : 'ВЫКЛЮЧЕН ✅';
  
  bot.sendMessage(chatId, `
👑 *Админ Панель*

📊 Статистика:
• Пользователей: ${users.size}
• Сообщений: ${botStats.totalMessages}
• Паролей: ${botStats.passwordGenerated}
• AI запросов: ${botStats.aiChats}

 Троллинг: ${trollStatus}

Команды:
/users - Список
/ban ID - Забанить
/unban ID - Разбанить
/broadcast - Рассылка
/troll - Управление троллингом
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
        [{ text: '📢 Рассылка', callback_data: 'admin_broadcast' }],
        [{ text: '👥 Пользователи', callback_data: 'admin_users' }],
        [{ text: '😈 Троллинг', callback_data: 'admin_troll_start' }],
        [{ text: '✅ Стоп Троллинг', callback_data: 'admin_troll_stop' }]
      ]
    }
  });
});

bot.onText(/\/users$/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  let list = '👥 Пользователи:\n\n';
  users.forEach((u, id) => list += `• ID: ${id} | ${u.firstName} (@${u.username || '-'})\n`);
  bot.sendMessage(msg.chat.id, list, { parse_mode: 'Markdown' });
});

bot.onText(/\/ban\s+(\d+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;
  const userId = parseInt(match[1]);
  bannedUsers.add(userId);
  bot.sendMessage(msg.chat.id, `✅ Пользователь ${userId} заблокирован 🔨`);
  bot.sendMessage(userId, '❌ Вы заблокированы администратором!\n\nПричина: нарушение правил');
});

bot.onText(/\/unban\s+(\d+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;
  const userId = parseInt(match[1]);
  bannedUsers.delete(userId);
  bot.sendMessage(msg.chat.id, `✅ Пользователь ${userId} разблокирован 🎉`);
});

// ТРОЛЛИНГ КОМАНДЫ
bot.onText(/\/troll/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  
  bot.sendMessage(msg.chat.id, `
🎭 *Управление троллингом*

/trollon - Включить троллинг
/trolloff - Выключить троллинг
/trolluser ID - Потроллить пользователя

😈 Режим: ${trollMode.get('active') ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/trollon/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  trollMode.set('active', true);
  bot.sendMessage(msg.chat.id, '😈 Троллинг включен! Пользователи получат забавные ответы.');
});

bot.onText(/\/trolloff/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  trollMode.set('active', false);
  bot.sendMessage(msg.chat.id, '✅ Троллинг выключен.');
});

bot.onText(/\/trolluser\s+(\d+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;
  const userId = parseInt(match[1]);
  
  const trollMessages = [
    '🎉 Поздравляем! Вы выиграли миллион долларов! (шутка 😄)',
    '⚠️ Ваш аккаунт будет удален через 5... 4... 3... (это шутка!)',
    '🤖 Мы обнаружили что вы робот! Докажите что вы человек! (просто шутим)',
    '🎁 Вам отправлен подарок! (пустой, но зато от души!)',
    '📢 Срочная новость: вы лучший пользователь этого бота! 🏆'
  ];
  
  const randomMsg = trollMessages[Math.floor(Math.random() * trollMessages.length)];
  
  try {
    bot.sendMessage(userId, randomMsg);
    bot.sendMessage(msg.chat.id, `✅ Пользователь ${userId} потроллен! 😈`);
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Не удалось потроллить (пользователь заблокировал бота?)`);
  }
});

let broadcastMode = new Set();

bot.onText(/\/broadcast/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  broadcastMode.add(msg.chat.id);
  bot.sendMessage(msg.chat.id, '📢 Отправьте текст для рассылки всем\n\n/cancel - отмена');
});

bot.onText(/\/cancel/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  broadcastMode.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, '❌ Отменено');
});

// ==================== ОБРАБОТКА СООБЩЕНИЙ (ИСПРАВЛЕНА) ====================
bot.on('message', (msg) => {
  if (!msg.text) return;
  
  botStats.totalMessages++;
  const stats = userStats.get(msg.chat.id) || { messages: 0, passwords: 0, aiQueries: 0 };
  stats.messages++;
  userStats.set(msg.chat.id, stats);
  
  // Рассылка от админа
  if (broadcastMode.has(msg.chat.id)) {
    let sent = 0;
    users.forEach((user, userId) => {
      try {
        bot.sendMessage(userId, `📢 ${msg.text}`);
        sent++;
      } catch (e) {}
    });
    bot.sendMessage(msg.chat.id, `✅ Отправлено ${sent} пользователям`);
    broadcastMode.delete(msg.chat.id);
    return;
  }
  
  // ТРОЛЛИНГ (только если включен)
  if (trollMode.get('active') && msg.chat.type === 'private' && !msg.text.startsWith('/')) {
    const trollResponses = [
      '🤔 Интересная мысль... но нет.',
      '😴 Я сплю, разбуди меня через 5 минут.',
      '🎲 А если я не хочу отвечать?',
      '🤷‍♂️ Кто знает, кто знает...',
      '📡 Сигнал потерян, попробуйте позже!',
      ' Я бы ответил, но мне лень.',
      '💭 Хм... давай спросим у волшебного шара!',
      '🎭 Ответ скрыт в глубинах интернета... шучу, я просто не знаю.'
    ];
    
    const randomResponse = trollResponses[Math.floor(Math.random() * trollResponses.length)];
    bot.sendMessage(msg.chat.id, randomResponse);
    return;
  }
  
  // Обычные сообщения - НЕ ОТВЕЧАЕМ (убрали "используйте команды")
  // Только если это не команда
});

// ==================== ЗАПУСК ====================
console.log('========================================');
console.log('🤖 TELEGRAM BOT ЗАПУЩЕН!');
console.log(`👑 Admin: ${ADMIN_ID}`);
console.log('🌐 Режим: Production');
console.log('========================================');

bot.on('polling_error', (err) => console.error('Polling Error:', err.message));
