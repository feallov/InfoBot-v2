/**
 *  Telegram Bot - Всё через кнопки!
 * Без команд, без каналов, без спама
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// ==================== НАСТРОЙКИ ====================
const BOT_TOKEN = process.env.BOT_TOKEN || '8986252320:AAFSOFrswuhs2eiGHJMY8Ie3IC5qjJG2sHw';
const ADMIN_ID = parseInt(process.env.ADMIN_ID) || 7220300785;
const AI_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ==================== БАЗА ДАННЫХ ====================
const users = new Map();
const bannedUsers = new Set();
const passwordSettings = new Map();
const aiChatMode = new Map();  // Режим ожидания вопроса ИИ
const reminderState = new Map(); // Режим ожидания напоминания
const weatherState = new Map(); // Режим ожидания города
const broadcastMode = new Set();
const trollMode = new Map();

let botStats = {
  totalMessages: 0,
  passwordGenerated: 0,
  aiChats: 0,
  startedAt: new Date()
};

// ==================== КЛАВИАТУРЫ ====================

// Главное меню (для всех)
const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: '🔐 Пароль' }, { text: '🧠 ИИ чат' }],
      [{ text: '⏰ Напомни' }, { text: '📊 Статистика' }],
      [{ text: '💱 Курс' }, { text: '🌤️ Погода' }],
      [{ text: '🎲 Кубик' }, { text: 'ℹ️ Помощь' }]
    ],
    resize_keyboard: true
  }
};

// Админ меню
const adminMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
      [{ text: '👥 Пользователи', callback_data: 'admin_users' }],
      [{ text: '📢 Рассылка', callback_data: 'admin_broadcast' }],
      [{ text: '😈 Тролл ВКЛ', callback_data: 'admin_troll_on' }, { text: '✅ Тролл ВЫКЛ', callback_data: 'admin_troll_off' }]
    ]
  }
};

// AI клавиатура
const aiKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '💡 Как приготовить борщ?', callback_data: 'ai_quick_borsh' }],
      [{ text: '💡 Расскажи анекдот', callback_data: 'ai_quick_joke' }],
      [{ text: '💡 Что такое ИИ?', callback_data: 'ai_quick_what' }],
      [{ text: '❌ Отмена', callback_data: 'ai_cancel' }]
    ]
  }
};

// Погода быстрые кнопки
const weatherKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🇷🇺 Москва', callback_data: 'w_moscow' }, { text: '🇷🇺 СПб', callback_data: 'w_spb' }],
      [{ text: '🇰🇿 Алматы', callback_data: 'w_almaty' }, { text: '🇧🇾 Минск', callback_data: 'w_minsk' }],
      [{ text: '🇬🇧 Лондон', callback_data: 'w_london' }, { text: '❌ Отмена', callback_data: 'w_cancel' }]
    ]
  }
};

// Рандомайзер
const randomKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [{ text: '🪙 Монетка', callback_data: 'rand_coin' }],
      [{ text: '🎲 Кубик', callback_data: 'rand_dice' }],
      [{ text: '🔢 Число 1-100', callback_data: 'rand_num' }]
    ]
  }
};

// Пароли
const getPasswordKeyboard = (s) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: `🔢 Цифры: ${s.useDigits ? '✅' : '❌'}`, callback_data: 'pwd_digits' }],
      [{ text: `🔤 Буквы: ${s.useLetters ? '✅' : '❌'}`, callback_data: 'pwd_letters' }],
      [{ text: `✨ Символы: ${s.useSpecial ? '✅' : '❌'}`, callback_data: 'pwd_special' }],
      [{ text: `📏 Длина: ${s.length}`, callback_data: 'pwd_length' }],
      [{ text: '🔄 Сгенерировать', callback_data: 'pwd_generate' }],
      [{ text: '↩️ Назад', callback_data: 'pwd_back' }]
    ]
  }
});

// ==================== СТАРТ ====================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  users.set(chatId, {
    id: chatId,
    username: msg.from.username,
    firstName,
    joinedAt: new Date().toISOString()
  });

  bot.sendMessage(chatId, `
 *Добро пожаловать, ${firstName}!*

Я умный бот с кучей функций! 🚀

Выберите кнопку ниже 👇
  `.trim(), mainMenu);
});

// ==================== КНОПКИ ГЛАВНОГО МЕНЮ ====================

// 🔐 ПАРОЛЬ
bot.onText(/🔐 Пароль/, (msg) => {
  const chatId = msg.chat.id;
  
  passwordSettings.set(chatId, {
    length: 12,
    useDigits: true,
    useLetters: true,
    useSpecial: false
  });

  bot.sendMessage(chatId, `
🔐 *Генератор паролей*

Нажмите кнопки для настройки:
  `.trim(), getPasswordKeyboard(passwordSettings.get(chatId)));
});

// 🧠 ИИ ЧАТ
bot.onText(/🧠 ИИ чат/, (msg) => {
  const chatId = msg.chat.id;
  aiChatMode.set(chatId, true);
  
  bot.sendMessage(chatId, `
🧠 *AI Чат*

Напишите ваш вопрос ИЛИ нажмите готовый:
  `.trim(), aiKeyboard);
});

// ⏰ НАПОМИНАНИЕ
bot.onText(/⏰ Напомни/, (msg) => {
  const chatId = msg.chat.id;
  reminderState.set(chatId, 'waiting_time');
  
  bot.sendMessage(chatId, `
⏰ *Напоминание*

Напишите через сколько минут напомнить:
• 5
• 10
• 30
• 60
  `.trim());
});

// 📊 СТАТИСТИКА
bot.onText(/📊 Статистика/, (msg) => {
  const chatId = msg.chat.id;
  const user = users.get(chatId);
  
  bot.sendMessage(chatId, `
📊 *Статистика*

👤 Имя: ${user?.firstName || 'Гость'}
🆔 ID: ${chatId}
📅 С нами: ${user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('ru-RU') : 'сейчас'}

🌐 В боте: ${users.size} пользователей
🔐 Паролей сгенерировано: ${botStats.passwordGenerated}
  `.trim());
});

// 💱 КУРС ВАЛЮТ
bot.onText(/💱 Курс/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendChatAction(chatId, 'typing');
  
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 10000 });
    const r = response.data.rates;
    
    bot.sendMessage(chatId, `
💱 *Курс валют*

🇷🇺 RUB: ${r.RUB?.toFixed(2)} ₽
🇪🇺 EUR: ${r.EUR?.toFixed(4)} €
🇰🇿 KZT: ${r.KZT?.toFixed(0)} ₸
₿ BTC: ${r.BTC?.toFixed(6)}
  `.trim());
  } catch (e) {
    bot.sendMessage(chatId, '⚠️ Ошибка получения курса');
  }
});

// 🌤️ ПОГОДА
bot.onText(/🌤️ Погода/, (msg) => {
  const chatId = msg.chat.id;
  weatherState.set(chatId, true);
  
  bot.sendMessage(chatId, `
🌤️ *Погода*

Выберите город или напишите название:
  `.trim(), weatherKeyboard);
});

// 🎲 КУБИК
bot.onText(/🎲 Кубик/, (msg) => {
  bot.sendMessage(msg.chat.id, '🎲 *Рандомайзер*', randomKeyboard);
});

// ℹ️ ПОМОЩЬ
bot.onText(/ℹ️ Помощь|\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `
ℹ️ *Помощь*

Просто нажимайте на кнопки в меню!

🔐 Пароль - надёжный пароль
🧠 ИИ чат - задайте вопрос
⏰ Напомни - установить таймер
📊 Статистика - ваша активность
💱 Курс - валюты
🌤️ Погода - прогноз
🎲 Кубик - рандомайзер
👑 /admin - админ-панель
  `.trim());
});

// ==================== CALLBACK QUERY ====================
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const mid = query.message.message_id;
  
  // === ПАРОЛЬ ===
  if (data.startsWith('pwd_')) {
    if (bannedUsers.has(chatId)) return;
    
    const s = passwordSettings.get(chatId) || { length: 12, useDigits: true, useLetters: true, useSpecial: false };
    
    if (data === 'pwd_digits') s.useDigits = !s.useDigits;
    else if (data === 'pwd_letters') s.useLetters = !s.useLetters;
    else if (data === 'pwd_special') s.useSpecial = !s.useSpecial;
    else if (data === 'pwd_length') s.length = s.length === 12 ? 16 : s.length === 16 ? 24 : s.length === 24 ? 32 : 12;
    else if (data === 'pwd_back') {
      bot.deleteMessage(chatId, mid);
      bot.sendMessage(chatId, 'Выберите действие:', mainMenu);
      return;
    }
    else if (data === 'pwd_generate') {
      let chars = '';
      if (s.useLetters) chars += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (s.useDigits) chars += '0123456789';
      if (s.useSpecial) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      if (!chars) chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      
      const crypto = require('crypto');
      const arr = new Uint32Array(s.length);
      crypto.randomFillSync(arr);
      
      let pwd = '';
      for (let i = 0; i < s.length; i++) pwd += chars[arr[i] % chars.length];
      
      botStats.passwordGenerated++;
      
      bot.sendMessage(chatId, `
✅ *Ваш пароль:*

\`${pwd}\`

📏 ${s.length} | 🔢 ${s.useDigits ? '✅' : '❌'} | 🔤 ${s.useLetters ? '✅' : '❌'} | ✨ ${s.useSpecial ? '✅' : '❌'}

⚠️ Сохраните в надёжном месте!
      `.trim(), getPasswordKeyboard(s));
      
      bot.answerCallbackQuery(query.id, { text: '✅ Сгенерировано!' });
      return;
    }
    
    passwordSettings.set(chatId, s);
    bot.editMessageReplyMarkup(getPasswordKeyboard(s).reply_markup, { chat_id: chatId, message_id: mid });
    bot.answerCallbackQuery(query.id);
    return;
  }
  
  // === AI ===
  if (data.startsWith('ai_')) {
    if (data === 'ai_cancel') {
      aiChatMode.delete(chatId);
      bot.deleteMessage(chatId, mid);
      bot.sendMessage(chatId, '✅ ИИ выключен', mainMenu);
      return;
    }
    
    let question = '';
    if (data === 'ai_quick_borsh') question = 'Как приготовить борщ?';
    else if (data === 'ai_quick_joke') question = 'Расскажи короткий смешной анекдот';
    else if (data === 'ai_quick_what') question = 'Что такое искусственный интеллект?';
    
    bot.sendChatAction(chatId, 'typing');
    
    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${AI_MODEL}`,
        {
          inputs: `<s>[INST] Отвечай на русском, кратко, 2-3 предложения: ${question} [/INST]`,
          parameters: { max_new_tokens: 200, temperature: 0.8, return_full_text: false }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
      );
      
      let answer = response.data[0]?.generated_text || 'Попробуйте позже!';
      answer = answer.replace(/^\s*/, '').trim().slice(0, 2000);
      
      bot.sendMessage(chatId, `🧠 *Ответ:*\n\n${answer}`, aiKeyboard);
    } catch (e) {
      bot.sendMessage(chatId, '⚠️ AI сейчас занят. Попробуйте через минуту!', aiKeyboard);
    }
    return;
  }
  
  // === ПОГОДА ===
  if (data.startsWith('w_')) {
    if (data === 'w_cancel') {
      weatherState.delete(chatId);
      bot.deleteMessage(chatId, mid);
      bot.sendMessage(chatId, '✅', mainMenu);
      return;
    }
    
    const cities = {
      w_moscow: { lat: 55.7558, lon: 37.6173, name: '🇷🇺 Москва' },
      w_spb: { lat: 59.9389, lon: 30.3159, name: '🇷🇺 Санкт-Петербург' },
      w_almaty: { lat: 43.2220, lon: 76.8512, name: '🇰🇿 Алматы' },
      w_minsk: { lat: 53.9006, lon: 27.5590, name: '🇧🇾 Минск' },
      w_london: { lat: 51.5074, lon: -0.1278, name: '🇬🇧 Лондон' }
    };
    
    const city = cities[data];
    if (!city) return;
    
    bot.sendChatAction(chatId, 'typing');
    
    try {
      const response = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`,
        { timeout: 10000 }
      );
      
      const w = response.data.current_weather;
      const icons = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 61: '🌧️', 63: '🌧️', 65: '🌧️', 95: '⛈️' };
      const desc = { 0: 'Ясно', 1: 'Ясно', 2: 'Облачно', 3: 'Пасмурно', 45: 'Туман', 61: 'Дождь', 63: 'Дождь', 95: 'Гроза' };
      
      bot.sendMessage(chatId, `
🌤️ *${city.name}*

${icons[w.weathercode] || '🌤️'} ${desc[w.weathercode] || ''}
🌡️ ${Math.round(w.temperature)}°C
💨 ${w.windspeed} м/с
      `.trim(), weatherKeyboard);
    } catch (e) {
      bot.sendMessage(chatId, '⚠️ Ошибка погоды', weatherKeyboard);
    }
    return;
  }
  
  // === РАНДОМАЙЗЕР ===
  if (data === 'rand_coin') {
    const r = Math.random() < 0.5 ? 'Орёл 🦅' : 'Решка 🪙';
    bot.answerCallbackQuery(query.id, { text: r });
    bot.sendMessage(chatId, `🪙 *${r}*`, { reply_markup: { inline_keyboard: [[{ text: '🪙 Ещё', callback_data: 'rand_coin' }]] }});
    return;
  }
  if (data === 'rand_dice') {
    const r = Math.floor(Math.random() * 6) + 1;
    bot.answerCallbackQuery(query.id, { text: `${r}!` });
    bot.sendMessage(chatId, `🎲 Выпало: *${r}*`, { reply_markup: { inline_keyboard: [[{ text: '🎲 Ещё', callback_data: 'rand_dice' }]] }});
    return;
  }
  if (data === 'rand_num') {
    const r = Math.floor(Math.random() * 100) + 1;
    bot.answerCallbackQuery(query.id, { text: `${r}!` });
    bot.sendMessage(chatId, `🔢 *${r}*`, { reply_markup: { inline_keyboard: [[{ text: '🔢 Ещё', callback_data: 'rand_num' }]] }});
    return;
  }
  
  // === АДМИН ===
  if (data.startsWith('admin_')) {
    if (chatId !== ADMIN_ID) {
      bot.answerCallbackQuery(query.id, { text: '❌ Доступ запрещён!', show_alert: true });
      return;
    }
    
    if (data === 'admin_stats') {
      bot.sendMessage(chatId, `
📊 *Статистика:*
• Пользователей: ${users.size}
• Сообщений: ${botStats.totalMessages}
• Паролей: ${botStats.passwordGenerated}
      `.trim());
      bot.answerCallbackQuery(query.id);
    }
    else if (data === 'admin_users') {
      let list = '👥 *Пользователи:*\n\n';
      users.forEach((u) => list += `• ${u.firstName}\n`);
      bot.sendMessage(chatId, list);
      bot.answerCallbackQuery(query.id);
    }
    else if (data === 'admin_broadcast') {
      broadcastMode.add(chatId);
      bot.sendMessage(chatId, '📢 Напишите текст для рассылки');
      bot.answerCallbackQuery(query.id);
    }
    else if (data === 'admin_troll_on') {
      trollMode.set('active', true);
      bot.sendMessage(chatId, '😈 Троллинг включен!');
      bot.answerCallbackQuery(query.id);
    }
    else if (data === 'admin_troll_off') {
      trollMode.delete('active');
      bot.sendMessage(chatId, '✅ Троллинг выключен');
      bot.answerCallbackQuery(query.id);
    }
    return;
  }
});

// ==================== АДМИН КОМАНДЫ ====================
bot.onText(/\/admin/, (msg) => {
  const chatId = msg.chat.id;
  if (chatId !== ADMIN_ID) {
    bot.sendMessage(chatId, '❌ Только для админа!');
    return;
  }
  
  bot.sendMessage(chatId, `
👑 *Админ Панель*

📊 Пользователей: ${users.size}
📝 Сообщений: ${botStats.totalMessages}
😈 Троллинг: ${trollMode.get('active') ? 'ВКЛ' : 'ВЫКЛ'}
  `.trim(), adminMenu);
});

// ==================== ОБЫЧНЫЕ СООБЩЕНИЯ ====================
bot.on('message', (msg) => {
  if (!msg.text) return;
  if (msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  botStats.totalMessages++;
  
  // Рассылка админа
  if (broadcastMode.has(chatId)) {
    let sent = 0;
    users.forEach((_, id) => {
      try { bot.sendMessage(id, `📢 ${msg.text}`); sent++; } catch (e) {}
    });
    bot.sendMessage(chatId, `✅ Отправлено ${sent}`, mainMenu);
    broadcastMode.delete(chatId);
    return;
  }
  
  // Режим AI - пользователь пишет свой вопрос
  if (aiChatMode.get(chatId)) {
    const question = msg.text;
    bot.sendChatAction(chatId, 'typing');
    
    axios.post(
      `https://api-inference.huggingface.co/models/${AI_MODEL}`,
      {
        inputs: `<s>[INST] Отвечай на русском, кратко, 2-3 предложения: ${question} [/INST]`,
        parameters: { max_new_tokens: 200, temperature: 0.8, return_full_text: false }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
    ).then(response => {
      let answer = response.data[0]?.generated_text || 'Попробуйте позже!';
      answer = answer.replace(/^\s*/, '').trim().slice(0, 2000);
      bot.sendMessage(chatId, `🧠 *Ответ:*\n\n${answer}`, aiKeyboard);
    }).catch(() => {
      bot.sendMessage(chatId, '⚠️ AI сейчас занят! Попробуйте позже.', aiKeyboard);
    });
    return;
  }
  
  // Режим напоминания
  if (reminderState.get(chatId) === 'waiting_time') {
    const minutes = parseInt(msg.text);
    if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
      bot.sendMessage(chatId, '❌ Напишите число от 1 до 1440');
      return;
    }
    reminderState.set(chatId, { minutes });
    bot.sendMessage(chatId, '⏰ Теперь напишите текст напоминания:');
    return;
  }
  
  if (reminderState.get(chatId)?.minutes && !reminderState.get(chatId)?.text) {
    const s = reminderState.get(chatId);
    s.text = msg.text;
    
    setTimeout(() => {
      bot.sendMessage(chatId, `⏰ *Напоминание!*\n\n${s.text}\n\n🔔 Время!`, mainMenu);
    }, s.minutes * 60000);
    
    bot.sendMessage(chatId, `
✅ *Напоминание создано!*

📝 ${s.text}
⏱️ Через ${s.minutes} мин.
🕐 ${new Date(Date.now() + s.minutes * 60000).toLocaleString('ru-RU')}
    `.trim(), mainMenu);
    reminderState.delete(chatId);
    return;
  }
  
  // Режим погоды
  if (weatherState.get(chatId)) {
    weatherState.delete(chatId);
    bot.sendChatAction(chatId, 'typing');
    
    const cityLower = msg.text.toLowerCase();
    
    try {
      // Демо-ответ с температурой
      const temp = Math.floor(Math.random() * 25) + 10;
      const conditions = ['☀️ Ясно', '☁️ Облачно', '🌤️ Переменная облачность'];
      const cond = conditions[Math.floor(Math.random() * conditions.length)];
      
      bot.sendMessage(chatId, `
🌤️ *${msg.text}*

${cond}
🌡️ ${temp}°C
💧 ${Math.floor(Math.random() * 40) + 40}%
💨 ${Math.floor(Math.random() * 10) + 2} м/с
      `.trim(), weatherKeyboard);
    } catch (e) {
      bot.sendMessage(chatId, '⚠️ Ошибка', weatherKeyboard);
    }
    return;
  }
  
  // Троллинг (если включен)
  if (trollMode.get('active') && chatId !== ADMIN_ID && !msg.text.startsWith('/')) {
    const trolls = [
      '🤔 Интересно... но нет.',
      '😴 Я сплю, разбуди позже.',
      '🎲 А если не отвечу?',
      '📡 Сигнал потерян!',
      '🤷‍♂️ Без комментариев.',
      '💭 Это было в другой жизни.',
      '🎭 Жду правильный вопрос...'
    ];
    bot.sendMessage(chatId, trolls[Math.floor(Math.random() * trolls.length)]);
    return;
  }
});

// ==================== ЗАПУСК ====================
console.log('========================================');
console.log('🤖 БОТ ЗАПУЩЕН!');
console.log(`👑 Admin: ${ADMIN_ID}`);
console.log(`🌐 Пользователей: ${users.size}`);
console.log('========================================');

bot.on('polling_error', (err) => console.error('Error:', err.message));
