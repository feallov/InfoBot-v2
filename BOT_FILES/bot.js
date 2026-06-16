/**
 *  Telegram Bot - 10 функций
 * Запуск на Render.com
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ==================== НАСТРОЙКИ ====================
const BOT_TOKEN = process.env.BOT_TOKEN || '8986252320:AAFSOFrswuhs2eiGHJMY8Ie3IC5qjJG2sHw';
const ADMIN_ID = parseInt(process.env.ADMIN_ID) || 7220300785;
const HF_API_TOKEN = process.env.HF_API_TOKEN || '';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';
const AI_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ==================== БАЗА ДАННЫХ ====================
const users = new Map();
const bannedUsers = new Set();
const reminders = new Map();
const userStats = new Map();
const passwordSettings = new Map();

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
      [' Напоминания', '📊 Статистика'],
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
      [{ text: ` Длина: ${settings.length}`, callback_data: 'pwd_length' }],
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

🎯 *Что я умею:*
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
️ /weather город - Погода
 /random - Рандомайзер
/coin - Монетка
/dice - Кубик
/number 1 100 - Число
 /admin - Админ-панель
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

// ==================== AI ЧАТ ====================
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
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${AI_MODEL}`,
      {
        inputs: `<s>[INST] Ты полезный помощник. Отвечай кратко на русском. Вопрос: ${question} [/INST]`,
        parameters: { max_new_tokens: 500, temperature: 0.7, return_full_text: false }
      },
      {
        headers: {
          'Authorization': HF_API_TOKEN ? `Bearer ${HF_API_TOKEN}` : '',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    let answer = response.data[0]?.generated_text || 'Извините, не смог ответить. Попробуйте ещё раз!';
    answer = answer.replace(/^\s*/, '').trim().slice(0, 4000);
    
    bot.sendMessage(chatId, `🧠 *AI Ответ:*\n\n${answer}`, { parse_mode: 'Markdown' });
    
  } catch (error) {
    bot.sendMessage(chatId, `⚠️ Ошибка AI. Попробуйте позже!`, { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/ai$/, (msg) => {
  bot.sendMessage(msg.chat.id, ' AI Чат\n\nОтправьте: /ai ваш вопрос', { parse_mode: 'Markdown' });
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
    bot.sendMessage(chatId, '️ Максимум 1440 минут (24 часа)');
    return;
  }
  
  const reminderId = Date.now();
  reminders.set(reminderId, { chatId, text, time: Date.now() + minutes * 60000 });
  
  bot.sendMessage(chatId, `
⏰ *Напоминание создано!*

📝 ${text}
️ Через ${minutes} мин.
 ${new Date(Date.now() + minutes * 60000).toLocaleString('ru-RU')}
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
 *Ваша статистика*

 Имя: ${user?.firstName || 'Неизвестно'}
🆔 ID: ${chatId}
📅 С нами: ${user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('ru-RU') : '-'}

 Активность:
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

 Технологии: ИИ развивается!
 Крипта: Биткоин растёт 📈
🔹 Наука: Новые открытия
🔹 Погода: Будет солнечно ☀️
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
 *Курс валют к USD*

🇷🇺 RUB: ${rates.RUB?.toFixed(2)} ₽
🇪🇺 EUR: ${rates.EUR?.toFixed(4)} €
🇰🇿 KZT: ${rates.KZT?.toFixed(2)} ₸
 BTC: ${rates.BTC?.toFixed(6)}
  `, { parse_mode: 'Markdown' });
    
  } catch (error) {
    bot.sendMessage(chatId, '⚠️ Не удалось получить курс', { parse_mode: 'Markdown' });
  }
});

// ==================== ПОГОДА ====================
bot.onText(/\/weather|🌤️ Погода/, (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  bot.sendMessage(chatId, `
🌤️ *Погода*

/weather город

Пример: /weather Москва
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/weather\s+(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const city = match[1];
  
  bot.sendChatAction(chatId, 'typing');
  
  if (!WEATHER_API_KEY) {
    const temp = Math.floor(Math.random() * 15) + 15;
    bot.sendMessage(chatId, `
🌤️ *Погода: ${city}*

🌡️ ${temp}°C (демо)
 65%
💨 5 м/с

💡 Для точных данных получите API ключ: openweathermap.org/api
    `, { parse_mode: 'Markdown' });
    return;
  }
  
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric&lang=ru`,
      { timeout: 10000 }
    );
    
    const d = response.data;
    bot.sendMessage(chatId, `
🌤️ *${d.name}, ${d.sys.country}*

️ ${Math.round(d.main.temp)}°C
🤔 Ощущается: ${Math.round(d.main.feels_like)}°C
💧 ${d.main.humidity}%
💨 ${d.wind.speed} м/с
    `, { parse_mode: 'Markdown' });
    
  } catch (error) {
    bot.sendMessage(chatId, `❌ Город "${city}" не найден`, { parse_mode: 'Markdown' });
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
      
      const array = new Uint32Array(settings.length);
      const crypto = require('crypto');
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
    return;
  }
  
  bot.answerCallbackQuery(query.id);
});

// ==================== АДМИН КОМАНДЫ ====================
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
  
  if (chatId !== ADMIN_ID) {
    bot.sendMessage(chatId, '❌ Доступ запрещён!', { parse_mode: 'Markdown' });
    return;
  }
  
  bot.sendMessage(chatId, `
👑 *Админ Панель*

📊 Статистика:
• Пользователей: ${users.size}
• Сообщений: ${botStats.totalMessages}

Команды:
/users - Список
/ban ID - Забанить
/unban ID - Разбанить
/broadcast - Рассылка
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
        [{ text: '📢 Рассылка', callback_data: 'admin_broadcast' }],
        [{ text: ' Пользователи', callback_data: 'admin_users' }]
      ]
    }
  });
});

bot.onText(/\/users$/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  let list = '👥 Пользователи:\n\n';
  users.forEach((u, id) => list += `• ID: ${id} | ${u.firstName}\n`);
  bot.sendMessage(msg.chat.id, list, { parse_mode: 'Markdown' });
});

bot.onText(/\/ban\s+(\d+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;
  bannedUsers.add(parseInt(match[1]));
  bot.sendMessage(msg.chat.id, '✅ Заблокирован');
});

bot.onText(/\/unban\s+(\d+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;
  bannedUsers.delete(parseInt(match[1]));
  bot.sendMessage(msg.chat.id, '✅ Разблокирован');
});

let broadcastMode = new Set();

bot.onText(/\/broadcast/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  broadcastMode.add(msg.chat.id);
  bot.sendMessage(msg.chat.id, '📢 Отправьте текст для рассылки всем');
});

bot.onText(/\/cancel/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  broadcastMode.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, '❌ Отменено');
});

// ==================== ОБРАБОТКА СООБЩЕНИЙ ====================
bot.on('message', (msg) => {
  if (!msg.text) return;
  
  botStats.totalMessages++;
  const stats = userStats.get(msg.chat.id) || { messages: 0, passwords: 0, aiQueries: 0 };
  stats.messages++;
  userStats.set(msg.chat.id, stats);
  
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
  
  if (msg.chat.type === 'private' && !msg.text.startsWith('/')) {
    bot.sendMessage(msg.chat.id, '💬 Используйте команды!\n\n/help - Помощь', { 
      parse_mode: 'Markdown',
      ...mainKeyboard 
    });
  }
});

// ==================== ЗАПУСК ====================
console.log('========================================');
console.log('🤖 TELEGRAM BOT ЗАПУЩЕН!');
console.log(`👑 Admin: ${ADMIN_ID}`);
console.log('========================================');

bot.on('polling_error', (err) => console.error('Error:', err.message));
