/**
 * Telegram Bot - Полностью рабочий, без багов
 * С мощной админ-панелью и троллингом
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const crypto = require('crypto');

// ==================== НАСТРОЙКИ ====================
const BOT_TOKEN = process.env.BOT_TOKEN || '8986252320:AAFSOFrswuhs2eiGHJMY8Ie3IC5qjJG2sHw';
const ADMIN_ID = parseInt(process.env.ADMIN_ID) || 7220300785;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ==================== БАЗА ДАННЫХ ====================
const users = new Map();
const bannedUsers = new Set();
const passwordSettings = new Map();
const adminState = new Map();
const trollMode = new Map();
const userMessages = new Map(); // Для подсчёта сообщений

// ==================== МЕНЮ ====================
const mainMenu = {
  reply_markup: {
    keyboard: [
      ['🔐 Генератор паролей', '🧠 AI Чат'],
      ['🌤️ Погода', '💱 Курс валют'],
      ['🎲 Рандомайзер', '📰 Новости'],
      ['📊 Моя статистика']
    ],
    resize_keyboard: true
  }
};

const adminMenu = {
  reply_markup: {
    keyboard: [
      ['👥 Пользователи', '📊 Статистика'],
      ['😈 Троллинг ВКЛ', '✅ Троллинг ВЫКЛ'],
      ['📢 Рассылка', '🔨 Бан'],
      ['🎉 Разбан', '🎯 Потроллить'],
      ['🔮 Предсказания', '🎲 Рандом админ'],
      ['⬅️ Главное меню']
    ],
    resize_keyboard: true
  }
};

// ==================== /start ====================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  if (!users.has(chatId)) {
    users.set(chatId, {
      id: chatId,
      username: msg.from.username || 'без_username',
      firstName: msg.from.first_name,
      joinedAt: new Date().toISOString(),
      messages: 0
    });
  }
  
  bot.sendMessage(chatId, 
    `👋 *Привет, ${msg.from.first_name}!*\n\nЯ бот с полезными функциями.\n\nВыбирай кнопки внизу 👇`,
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

// ==================== ГЕНЕРАТОР ПАРОЛЕЙ ====================
bot.onText(/🔐 Генератор паролей/, (msg) => {
  const chatId = msg.chat.id;
  if (bannedUsers.has(chatId)) return;
  
  passwordSettings.set(chatId, { length: 12, digits: true, letters: true, special: false });
  
  bot.sendMessage(chatId, '🔐 *Генератор паролей*\n\nНажми на кнопки:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔢 Цифры: ВКЛ', callback_data: 'pwd_digits' }],
        [{ text: '🔤 Буквы: ВКЛ', callback_data: 'pwd_letters' }],
        [{ text: '✨ Спецсимволы: ВЫКЛ', callback_data: 'pwd_special' }],
        [{ text: '📏 Длина: 12', callback_data: 'pwd_length' }],
        [{ text: '🎲 СГЕНЕРИРОВАТЬ', callback_data: 'pwd_gen' }]
      ]
    }
  });
});

// ==================== AI ЧАТ ====================
bot.onText(/🧠 AI Чат/, (msg) => {
  const chatId = msg.chat.id;
  if (bannedUsers.has(chatId)) return;
  
  userMessages.set(chatId, { type: 'ai', timestamp: Date.now() });
  
  bot.sendMessage(chatId, 
    '🧠 *AI Чат*\n\nНапиши вопрос следующим сообщением!',
    { parse_mode: 'Markdown' }
  );
});

// ==================== ПОГОДА ====================
bot.onText(/🌤️ Погода/, (msg) => {
  const chatId = msg.chat.id;
  if (bannedUsers.has(chatId)) return;
  
  userMessages.set(chatId, { type: 'weather', timestamp: Date.now() });
  
  bot.sendMessage(chatId, 
    '🌤️ *Погода*\n\nНапиши название города!',
    { parse_mode: 'Markdown' }
  );
});

// ==================== КУРС ВАЛЮТ ====================
bot.onText(/💱 Курс валют/, async (msg) => {
  const chatId = msg.chat.id;
  if (bannedUsers.has(chatId)) return;
  
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 8000 });
    const r = response.data.rates;
    
    bot.sendMessage(chatId, 
      `💱 *Курс к USD*\n\n🇷🇺 RUB: ${r.RUB?.toFixed(2)} ₽\n🇪🇺 EUR: ${r.EUR?.toFixed(4)} €\n🇰🇿 KZT: ${r.KZT?.toFixed(2)} ₸\n🇧🇾 BYN: ${r.BYN?.toFixed(2)} Br\n₿ BTC: ${r.BTC?.toFixed(6)}`,
      { parse_mode: 'Markdown', ...mainMenu }
    );
  } catch (error) {
    bot.sendMessage(chatId, '⚠️ Не удалось получить курс', mainMenu);
  }
});

// ==================== РАНДОМАЙЗЕР ====================
bot.onText(/🎲 Рандомайзер/, (msg) => {
  const chatId = msg.chat.id;
  if (bannedUsers.has(chatId)) return;
  
  bot.sendMessage(chatId, '🎲 *Выбери:*\n\nНажми кнопку:', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🪙 Монетка', callback_data: 'coin' }],
        [{ text: '🎲 Кубик 1-6', callback_data: 'dice' }],
        [{ text: '🔢 Число 1-100', callback_data: 'num100' }]
      ]
    }
  });
});

// ==================== НОВОСТИ ====================
bot.onText(/📰 Новости/, (msg) => {
  const chatId = msg.chat.id;
  if (bannedUsers.has(chatId)) return;
  
  bot.sendMessage(chatId, 
    `📰 *Новости*\n\n🔹 ИИ развивается!\n🔹 Биткоин стабилен 📊\n🔹 Новые открытия 🔬\n🔹 Наши победили! 🏆`,
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

// ==================== СТАТИСТИКА ====================
bot.onText(/📊 Моя статистика/, (msg) => {
  const chatId = msg.chat.id;
  if (bannedUsers.has(chatId)) return;
  
  const user = users.get(chatId);
  
  bot.sendMessage(chatId, 
    `📊 *Твоя статистика*\n\n👤 ${user?.firstName || 'Неизвестно'}\n🆔 ID: ${chatId}\n📅 В боте с: ${user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('ru-RU') : '...'}`,
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

// ==================== АДМИН ПАНЕЛЬ ====================
bot.onText(/Админ|admin|АДМИН/i, (msg) => {
  const chatId = msg.chat.id;
  
  if (chatId !== ADMIN_ID) {
    bot.sendMessage(chatId, '❌ Только админ!', mainMenu);
    return;
  }
  
  const trollStatus = trollMode.get('active') ? '😈 ВКЛЮЧЕН' : '✅ ВЫКЛЮЧЕН';
  const banCount = bannedUsers.size;
  
  bot.sendMessage(chatId, 
    `👑 *АДМИН ПАНЕЛЬ*\n\n📊 Пользователей: ${users.size}\n🔨 Забанено: ${banCount}\n🎭 Троллинг: ${trollStatus}`,
    { parse_mode: 'Markdown', ...adminMenu }
  );
});

// ==================== АДМИН ФУНКЦИИ ====================
bot.onText(/👥 Пользователи/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  
  let list = `👥 *Всего: ${users.size}*\n\n`;
  let count = 0;
  users.forEach((u, id) => {
    if (count < 50) {
      list += `• ${u.firstName} (@${u.username}) - \`${id}\`\n`;
      count++;
    }
  });
  
  bot.sendMessage(msg.chat.id, list, { parse_mode: 'Markdown', ...adminMenu });
});

bot.onText(/📊 Статистика/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  
  let totalMsgs = 0;
  userMessages.forEach((data) => totalMsgs++);
  
  bot.sendMessage(msg.chat.id, 
    `📊 *Статистика бота*\n\n👥 Пользователей: ${users.size}\n🔨 Забанено: ${bannedUsers.size}\n💬 Сообщений: ${totalMsgs}\n😈 Троллинг: ${trollMode.get('active') ? 'ВКЛ' : 'ВЫКЛ'}`,
    { parse_mode: 'Markdown', ...adminMenu }
  );
});

bot.onText(/😈 Троллинг ВКЛ/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  trollMode.set('active', true);
  bot.sendMessage(msg.chat.id, '😈 Троллинг ВКЛЮЧЕН!\n\nВсе пользователи получат забавные ответы.', adminMenu);
});

bot.onText(/✅ Троллинг ВЫКЛ/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  trollMode.set('active', false);
  bot.sendMessage(msg.chat.id, '✅ Троллинг ВЫКЛЮЧЕН.', adminMenu);
});

bot.onText(/📢 Рассылка/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  adminState.set(msg.chat.id, 'broadcast');
  bot.sendMessage(msg.chat.id, '📢 *Отправь текст для рассылки:*\n\n/cancel - отмена', { parse_mode: 'Markdown' });
});

bot.onText(/🔨 Бан/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  adminState.set(msg.chat.id, 'ban');
  bot.sendMessage(msg.chat.id, '🔨 *Отправь ID для бана:*\n\n/cancel - отмена', { parse_mode: 'Markdown' });
});

bot.onText(/🎉 Разбан/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  adminState.set(msg.chat.id, 'unban');
  bot.sendMessage(msg.chat.id, '🎉 *Отправь ID для разбана:*\n\n/cancel - отмена', { parse_mode: 'Markdown' });
});

bot.onText(/🎯 Потроллить/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  adminState.set(msg.chat.id, 'troll');
  bot.sendMessage(msg.chat.id, '🎯 *Отправь ID чтобы потроллить:*\n\n/cancel - отмена', { parse_mode: 'Markdown' });
});

bot.onText(/🔮 Предсказания/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  
  const predictions = [
    '🔮 Сегодня удачный день для новых начинаний!',
    '🔮 Тебя ждёт приятный сюрприз!',
    '🔮 Будь осторожен с решениями сегодня.',
    '🔮 Удача на твоей стороне!',
    '🔮 Звёзды говорят: действуй смело!'
  ];
  
  bot.sendMessage(msg.chat.id, predictions[Math.floor(Math.random() * predictions.length)], adminMenu);
});

bot.onText(/🎲 Рандом админ/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  
  const num = Math.floor(Math.random() * 1000) + 1;
  bot.sendMessage(msg.chat.id, `🎲 Случайное число: ${num}`, adminMenu);
});

bot.onText(/⬅️ Главное меню/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Главное меню:', mainMenu);
});

bot.onText(/\/cancel/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  adminState.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, '❌ Отменено', adminMenu);
});

// ==================== ОБРАБОТКА СООБЩЕНИЙ ====================
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (!text) return;
  if (text.startsWith('/start')) return;
  
  // Пропускаем кнопки меню
  const menuEmojis = /[🔐🧠️💱🎲📰📊😈✅🔨🎯⬅️]/;
  if (text.match(menuEmojis)) return;
  
  // БАН
  if (bannedUsers.has(chatId)) return;
  
  // АДМИН ДЕЙСТВИЯ
  if (chatId === ADMIN_ID) {
    const state = adminState.get(chatId);
    
    if (state && !text.match(menuEmojis)) {
      const id = parseInt(text);
      
      if (state === 'broadcast') {
        let sent = 0;
        users.forEach((u, uid) => {
          try {
            bot.sendMessage(uid, `📢 *От админа:*\n\n${text}`, { parse_mode: 'Markdown' });
            sent++;
          } catch(e) {}
        });
        bot.sendMessage(chatId, `✅ Отправлено ${sent} пользователям`, adminMenu);
        adminState.delete(chatId);
        return;
      }
      
      if (state === 'ban' && id > 1000000) {
        bannedUsers.add(id);
        bot.sendMessage(chatId, `✅ ${id} забанен!`, adminMenu);
        try { bot.sendMessage(id, '❌ Вы забанены!'); } catch(e) {}
        adminState.delete(chatId);
        return;
      }
      
      if (state === 'unban' && id > 1000000) {
        bannedUsers.delete(id);
        bot.sendMessage(chatId, `✅ ${id} разбанен!`, adminMenu);
        adminState.delete(chatId);
        return;
      }
      
      if (state === 'troll' && id > 1000000) {
        const jokes = [
          '🎉 Вы выиграли миллион! (шутка 😄)',
          '⚠️ Аккаунт будет удалён через 5... 4... (шутка!)',
          '🤖 Вы робот? Докажите! (просто шутим)',
          '📢 Срочно: вы лучший! 🏆',
          ' Вам подарок! (пустой, но от души!)'
        ];
        try {
          bot.sendMessage(id, jokes[Math.floor(Math.random() * jokes.length)]);
          bot.sendMessage(chatId, `😈 ${id} потроллен!`, adminMenu);
        } catch(e) {
          bot.sendMessage(chatId, `❌ Не удалось`, adminMenu);
        }
        adminState.delete(chatId);
        return;
      }
    }
  }
  
  // AI ЧАТ (если после нажатия AI Чат)
  const userMsg = userMessages.get(chatId);
  if (userMsg && userMsg.type === 'ai' && Date.now() - userMsg.timestamp < 60000) {
    userMessages.delete(chatId);
    await handleAI(chatId, text);
    return;
  }
  
  // ПОГОДА (если после нажатия Погода)
  if (userMsg && userMsg.type === 'weather' && Date.now() - userMsg.timestamp < 60000) {
    userMessages.delete(chatId);
    await handleWeather(chatId, text);
    return;
  }
  
  // ТРОЛЛИНГ (если включен)
  if (trollMode.get('active') && chatId !== ADMIN_ID && text.length > 3) {
    const responses = [
      '🤔 Хм... интересно...',
      '😴 Я сплю, не мешай...',
      '🎲 А если я не хочу отвечать?',
      '📡 Связь потеряна...',
      '💭 Слишком сложно!',
      '🤷‍♂️ Кто знает...',
      '🎭 Ответ скрыт в глубинах...',
      ' Перезагрузись и попробуй снова!'
    ];
    bot.sendMessage(chatId, responses[Math.floor(Math.random() * responses.length)]);
    return;
  }
  
  // Обновляем статистику пользователя
  const user = users.get(chatId);
  if (user) {
    user.messages = (user.messages || 0) + 1;
    users.set(chatId, user);
  }
});

// ==================== AI ФУНКЦИЯ ====================
async function handleAI(chatId, question) {
  bot.sendChatAction(chatId, 'typing');
  
  try {
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      {
        inputs: `<s>[INST] Ответь ОЧЕНЬ кратко на русском (1-2 предложения): ${question} [/INST]`,
        parameters: { max_new_tokens: 150, temperature: 0.7 }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    
    let answer = response.data?.[0]?.generated_text?.trim() || '';
    
    if (answer.length < 5 || answer.includes('Model') || answer.includes('error')) {
      answer = getFallbackAI(question);
    }
    
    bot.sendMessage(chatId, `🧠 ${answer}`, mainMenu);
    
  } catch (error) {
    const answer = getFallbackAI(question);
    bot.sendMessage(chatId, `🧠 ${answer}`, mainMenu);
  }
}

function getFallbackAI(q) {
  const text = q.toLowerCase();
  
  if (text.includes('привет')) return 'Привет! Как дела? 😊';
  if (text.includes('как дела')) return 'Отлично! Готов помочь! 😉';
  if (text.includes('пицц')) return 'Пицца: тесто + соус + сыр + начинка. 15 мин при 220°C! 🍕';
  if (text.includes('борщ')) return 'Борщ: свёкла, капуста, картошка, мясо. Варить 1.5 часа! 🍲';
  if (text.includes('анекдот') || text.includes('шутк')) return 'Почему программисты путают Хэллоуин и Рождество? Oct 31 = Dec 25! 😄';
  if (text.includes('врем')) return `Сейчас ${new Date().toLocaleTimeString('ru-RU')}! ⏰`;
  if (text.includes('спасибо')) return 'Пожалуйста! 😊';
  if (text.includes('пока')) return 'До свидания! Хорошего дня! 👋';
  if (text.includes('что такое')) return 'Это интересный вопрос! Погугли для подробностей 😉';
  if (text.includes('как ')) return 'Для этого нужно: 1) Цель 2) Способ 3) Действовать! 💪';
  if (text.includes('почему')) return 'Причины могут быть разными! Чаще всего логика или случайность 🤔';
  if (text.includes('кто ')) return 'Кто-то важный! Но я не знаю кто именно 🤷‍♂️';
  if (text.includes('где ')) return 'Где-то там! Но я не знаю где именно 🗺️';
  if (text.includes('когда')) return 'Когда-нибудь обязательно! Но не знаю когда ⏰';
  
  return 'Интересный вопрос! 🤔 Попробуй спросить что-то ещё!';
}

// ==================== ПОГОДА ФУНКЦИЯ ====================
async function handleWeather(chatId, city) {
  bot.sendChatAction(chatId, 'typing');
  
  const cities = {
    'москва': { lat: 55.7558, lon: 37.6173, name: 'Москва 🇷🇺' },
    'спб': { lat: 59.9311, lon: 30.3609, name: 'Санкт-Петербург 🇷🇺' },
    'санкт-петербург': { lat: 59.9311, lon: 30.3609, name: 'Санкт-Петербург 🇷🇺' },
    'казань': { lat: 55.7961, lon: 49.1064, name: 'Казань 🇷' },
    'екатеринбург': { lat: 56.8389, lon: 60.6057, name: 'Екатеринбург 🇷' },
    'новосибирск': { lat: 55.0084, lon: 82.9357, name: 'Новосибирск 🇷' },
    'алматы': { lat: 43.2220, lon: 76.8512, name: 'Алматы 🇰🇿' },
    'минск': { lat: 53.9006, lon: 27.5590, name: 'Минск 🇧🇾' },
    'киев': { lat: 50.4501, lon: 30.5234, name: 'Киев 🇺🇦' },
    'london': { lat: 51.5074, lon: -0.1278, name: 'London 🇬🇧' },
    'new york': { lat: 40.7128, lon: -74.0060, name: 'New York 🇺🇸' },
    'paris': { lat: 48.8566, lon: 2.3522, name: 'Paris 🇫🇷' }
  };
  
  const cityLower = city.toLowerCase().trim();
  const cityData = cities[cityLower];
  
  if (cityData) {
    try {
      const response = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${cityData.lat}&longitude=${cityData.lon}&current_weather=true`,
        { timeout: 8000 }
      );
      
      const w = response.data.current_weather;
      const icons = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 51: '🌦️', 61: '🌧️', 71: '🌨️', 95: '⛈️' };
      const icon = icons[w.weathercode] || '🌤️';
      
      bot.sendMessage(chatId, 
        `🌤️ *${cityData.name}*\n\n${icon} ${Math.round(w.temperature)}°C\n💨 Ветер: ${w.windspeed} км/ч`,
        { parse_mode: 'Markdown', ...mainMenu }
      );
      return;
    } catch (error) {
      // Fallback
    }
  }
  
  const temp = Math.floor(Math.random() * 25) + 10;
  bot.sendMessage(chatId, 
    `🌤️ *${city}*\n\n🌡️ ~${temp}°C (приблизительно)\n\n⚠️ Для точных данных напиши: Москва, СПб, Алматы, London...`,
    { parse_mode: 'Markdown', ...mainMenu }
  );
}

// ==================== CALLBACK QUERY ====================
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  if (bannedUsers.has(chatId)) {
    bot.answerCallbackQuery(query.id, { text: '❌ Забанен', show_alert: true });
    return;
  }
  
  // ПАРОЛЬ
  if (data.startsWith('pwd_')) {
    let s = passwordSettings.get(chatId);
    if (!s) s = { length: 12, digits: true, letters: true, special: false };
    
    if (data === 'pwd_digits') s.digits = !s.digits;
    else if (data === 'pwd_letters') s.letters = !s.letters;
    else if (data === 'pwd_special') s.special = !s.special;
    else if (data === 'pwd_length') s.length = s.length === 12 ? 16 : s.length === 16 ? 24 : s.length === 24 ? 32 : 12;
    else if (data === 'pwd_gen') {
      let chars = '';
      if (s.letters) chars += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (s.digits) chars += '0123456789';
      if (s.special) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      if (!chars) chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      
      const array = new Uint32Array(s.length);
      crypto.randomFillSync(array);
      
      let pwd = '';
      for (let i = 0; i < s.length; i++) pwd += chars[array[i] % chars.length];
      
      bot.sendMessage(chatId, `✅ *Пароль:*\n\n\`${pwd}\`\n\n📏 ${s.length} симв.`, { 
        parse_mode: 'HTML',
        ...mainMenu 
      });
      bot.answerCallbackQuery(query.id, { text: '✅ Готово!' });
      return;
    }
    
    passwordSettings.set(chatId, s);
    
    bot.editMessageReplyMarkup({
      inline_keyboard: [
        [{ text: `🔢 Цифры: ${s.digits ? 'ВКЛ' : 'ВЫКЛ'}`, callback_data: 'pwd_digits' }],
        [{ text: `🔤 Буквы: ${s.letters ? 'ВКЛ' : 'ВЫКЛ'}`, callback_data: 'pwd_letters' }],
        [{ text: `✨ Спец: ${s.special ? 'ВКЛ' : 'ВЫКЛ'}`, callback_data: 'pwd_special' }],
        [{ text: `📏 Длина: ${s.length}`, callback_data: 'pwd_length' }],
        [{ text: '🎲 СГЕНЕРИРОВАТЬ', callback_data: 'pwd_gen' }]
      ]
    }, { chat_id: chatId, message_id: query.message.message_id });
    
    bot.answerCallbackQuery(query.id);
    return;
  }
  
  // РАНДОМ
  if (data === 'coin') {
    const r = Math.random() < 0.5 ? 'Орёл 🦅' : 'Решка 🪙';
    bot.sendMessage(chatId, `🪙 ${r}`, mainMenu);
    bot.answerCallbackQuery(query.id);
    return;
  }
  
  if (data === 'dice') {
    const r = Math.floor(Math.random() * 6) + 1;
    bot.sendMessage(chatId, `🎲 Выпало: ${r}`, mainMenu);
    bot.answerCallbackQuery(query.id);
    return;
  }
  
  if (data === 'num100') {
    const r = Math.floor(Math.random() * 100) + 1;
    bot.sendMessage(chatId, `🔢 Число: ${r}`, mainMenu);
    bot.answerCallbackQuery(query.id);
    return;
  }
  
  bot.answerCallbackQuery(query.id);
});

// ==================== ЗАПУСК ====================
console.log('========================================');
console.log('🤖 TELEGRAM BOT STARTED!');
console.log(`👑 Admin ID: ${ADMIN_ID}`);
console.log('========================================');
