/**
 * Telegram Bot - Только кнопки, без команд!
 * Исправленная версия
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN || '8986252320:AAFSOFrswuhs2eiGHJMY8Ie3IC5qjJG2sHw';
const ADMIN_ID = parseInt(process.env.ADMIN_ID) || 7220300785;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// База данных
const users = new Map();
const bannedUsers = new Set();
const passwordSettings = new Map();
const trollMode = new Map();

// Главное меню (всё через кнопки!)
const mainMenu = {
  reply_markup: {
    keyboard: [
      ['🔐 Пароль', '🧠 AI Помощник'],
      ['🌤️ Погода', '💱 Курс валют'],
      ['🎲 Рандом', '📰 Новости'],
      ['ℹ️ Помощь']
    ],
    resize_keyboard: true
  }
};

// Меню админа
const adminMenu = {
  reply_markup: {
    keyboard: [
      ['👥 Пользователи', '📊 Статистика'],
      ['😈 Троллинг ВКЛ', '✅ Троллинг ВЫКЛ'],
      ['📢 Рассылка', '🔨 Забанить'],
      ['🎉 Разбанить', '🎯 Потроллить'],
      ['⬅️ Назад в меню']
    ],
    resize_keyboard: true
  }
};

// Приветствие
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  users.set(chatId, {
    id: chatId,
    username: msg.from.username,
    firstName,
    joinedAt: new Date().toISOString()
  });

  bot.sendMessage(chatId, 
    `👋 Привет, ${firstName}!\n\nЯ бот с полезными функциями.\nВсё управление через кнопки ниже! 👇`,
    mainMenu
  );
});

// Генератор паролей
bot.onText(/🔐 Пароль|Пароль/, (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  passwordSettings.set(chatId, { length: 12, useDigits: true, useLetters: true, useSpecial: false });
  
  bot.sendMessage(chatId, '🔐 Генератор паролей\n\nВыберите настройки:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔢 Цифры: ВКЛ', callback_data: 'pwd_digits' }],
        [{ text: '🔤 Буквы: ВКЛ', callback_data: 'pwd_letters' }],
        [{ text: '✨ Спецсимволы: ВЫКЛ', callback_data: 'pwd_special' }],
        [{ text: '📏 Длина: 12', callback_data: 'pwd_length' }],
        [{ text: '🎲 Сгенерировать!', callback_data: 'pwd_generate' }]
      ]
    }
  });
});

// AI Помощник (исправленный)
bot.onText(/🧠 AI Помощник|AI Помощник/, (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  bot.sendMessage(chatId, 
    '🧠 AI Помощник\n\nНапишите ваш вопрос одним сообщением, и я постараюсь ответить!\n\nПримеры:\n• Как приготовить пиццу?\n• Что такое квантовая физика?\n• Расскажи анекдот',
    { reply_markup: { force_reply: true } }
  );
});

// Обработка AI запроса
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  
  // Пропускаем команды и кнопки
  if (!msg.text || msg.text.startsWith('/') || msg.text.match(/[🔐🧠🌤️💱🎲📰ℹ️👥📊😈✅📢🔨🎉🎯⬅️]/)) return;
  
  if (isBanned(chatId)) return;
  
  // Проверяем, это AI запрос?
  const user = users.get(chatId);
  if (!user) return;
  
  // AI ответ
  bot.sendChatAction(chatId, 'typing');
  
  try {
    // Пробуем Hugging Face с таймаутом
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
      {
        inputs: `<s>[INST] Ответь кратко на русском: ${msg.text} [/INST]`,
        parameters: { max_new_tokens: 200, temperature: 0.7 }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    
    let answer = response.data[0]?.generated_text?.trim() || '';
    
    // Если ответ пустой или странный - используем заготовки
    if (answer.length < 5 || answer.includes('Model') || answer.includes('error')) {
      answer = getAIResponse(msg.text);
    }
    
    bot.sendMessage(chatId, `🧠 ${answer}`, mainMenu);
    
  } catch (error) {
    // Fallback на заготовленные ответы
    const fallbackAnswer = getAIResponse(msg.text);
    bot.sendMessage(chatId, `🧠 ${fallbackAnswer}`, mainMenu);
  }
});

// Заготовленные AI ответы (когда API недоступен)
function getAIResponse(question) {
  const q = question.toLowerCase();
  
  if (q.includes('привет') || q.includes('здравствуй')) {
    return 'Привет! Как дела? 😊';
  }
  if (q.includes('как дела')) {
    return 'Отлично! Готов помочь тебе 😉';
  }
  if (q.includes('пицц')) {
    return 'Пицца: тесто, томатный соус, сыр, начинка по вкусу. 15 мин в духовке при 220°C! 🍕';
  }
  if (q.includes('борщ')) {
    return 'Борщ: свёкла, капуста, картошка, морковь, лук, томат, мясо. Варить 1.5 часа! 🍲';
  }
  if (q.includes('анекдот') || q.includes('шутк')) {
    const jokes = [
      'Почему программисты путают Хэллоуин и Рождество? Потому что Oct 31 = Dec 25! 😄',
      'Заходит улитка в бар. Бармен говорит: "У нас строгие правила - никаких улиток!" Улитка отвечает: "Ну ладно..." и уползает.',
      'Купил мужик шляпу, а она ему как раз! 🎩'
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  if (q.includes('погод')) {
    return 'Погоду можно узнать по кнопке 🌤️ Погода!';
  }
  if (q.includes('врем')) {
    return `Сейчас ${new Date().toLocaleTimeString('ru-RU')}! ⏰`;
  }
  if (q.includes('спасибо')) {
    return 'Пожалуйста! Обращайтесь ещё 😊';
  }
  if (q.includes('пока') || q.includes('до свидан')) {
    return 'До свидания! Хорошего дня! 👋';
  }
  
  // Умные ответы по темам
  if (q.includes('что такое')) {
    return `${question.replace('что такое', '').trim()} - это интересная тема! Коротко: это то, о чём ты спросил. Подробнее можешь найти в интернете 😉`;
  }
  if (q.includes('как')) {
    return 'Для этого нужно: 1) Определить цель, 2) Найти способ, 3) Действовать! Удачи! 💪';
  }
  if (q.includes('почему')) {
    return 'Причины могут быть разными. Чаще всего это связано с законами физики, логикой или просто случайностью! 🤔';
  }
  if (q.includes('сколько')) {
    return 'Точное число зависит от многих факторов. Могу сказать примерно... много! 😄';
  }
  
  return 'Интересный вопрос! 🤔 Я подумаю над этим. А пока попробуй другие функции бота!';
}

// Погода
bot.onText(/🌤️ Погода|Погода/, async (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  bot.sendMessage(chatId, '🌤️ Выберите город:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🇷🇺 Москва', callback_data: 'weather_moscow' }],
        [{ text: '🇷🇺 СПб', callback_data: 'weather_spb' }],
        [{ text: '🇷🇺 Казань', callback_data: 'weather_kazan' }],
        [{ text: '🇰🇿 Алматы', callback_data: 'weather_almaty' }],
        [{ text: '🇬🇧 London', callback_data: 'weather_london' }],
        [{ text: '🇺🇸 New York', callback_data: 'weather_ny' }]
      ]
    }
  });
});

// Курс валют
bot.onText(/💱 Курс валют|Курс валют/, async (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  bot.sendChatAction(chatId, 'typing');
  
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 });
    const rates = response.data.rates;
    
    bot.sendMessage(chatId, 
      `💱 Курс валют\n\n🇷🇺 USD/RUB: ${rates.RUB?.toFixed(2)} ₽\n🇪🇺 USD/EUR: ${rates.EUR?.toFixed(4)} €\n🇰🇿 USD/KZT: ${rates.KZT?.toFixed(2)} ₸`,
      mainMenu
    );
  } catch (error) {
    bot.sendMessage(chatId, '⚠️ Не удалось получить курс. Попробуйте позже!', mainMenu);
  }
});

// Рандом
bot.onText(/🎲 Рандом|Рандом/, (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  bot.sendMessage(chatId, '🎲 Выберите:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🪙 Монетка', callback_data: 'rand_coin' }],
        [{ text: '🎲 Кубик (1-6)', callback_data: 'rand_dice' }],
        [{ text: '🔢 Число 1-100', callback_data: 'rand_num' }]
      ]
    }
  });
});

// Новости
bot.onText(/📰 Новости|Новости/, (msg) => {
  const chatId = msg.chat.id;
  if (isBanned(chatId)) return;
  
  bot.sendMessage(chatId, 
    '📰 Новости дня:\n\n🔹 Технологии: AI продолжает развиваться!\n🔹 Крипта: Биткоин стабилен 📊\n🔹 Погода: Везде разная ☀️\n🔹 Наука: Новые открытия!',
    mainMenu
  );
});

// Помощь
bot.onText(/ℹ️ Помощь|Помощь/, (msg) => {
  const chatId = msg.chat.id;
  
  if (chatId === ADMIN_ID) {
    bot.sendMessage(chatId, 
      '👑 Вы Админ!\n\n🎛 Основное меню: кнопки ниже\n👑 Админ-панель: напишите "Админ" или нажмите кнопки админа',
      { ...mainMenu, ...adminMenu }
    );
  } else {
    bot.sendMessage(chatId, 
      'ℹ️ Как пользоваться:\n\nВсё управление через кнопки!\n\n🔐 Пароль - генератор паролей\n🧠 AI Помощник - задайте вопрос\n🌤️ Погода - узнать погоду\n💱 Курс валют - USD к рублю\n🎲 Рандом - случайные числа\n📰 Новости - свежие новости',
      mainMenu
    );
  }
});

// ============= АДМИН ФУНКЦИИ =============

bot.onText(/Админ|👑|admin/i, (msg) => {
  const chatId = msg.chat.id;
  if (chatId !== ADMIN_ID) {
    bot.sendMessage(chatId, '❌ Только для админа!', mainMenu);
    return;
  }
  
  bot.sendMessage(chatId, '👑 Админ-панель', adminMenu);
});

bot.onText(/👥 Пользователи|Пользователи/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  
  let list = `👥 Всего: ${users.size}\n\n`;
  users.forEach((u, id) => {
    list += `• ${u.firstName} (@${u.username || 'нет'}) - ID: ${id}\n`;
  });
  
  bot.sendMessage(msg.chat.id, list, adminMenu);
});

bot.onText(/📊 Статистика|Статистика/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  
  bot.sendMessage(msg.chat.id, 
    `📊 Статистика бота:\n\n👥 Пользователей: ${users.size}\n🔨 Забанено: ${bannedUsers.size}\n😈 Троллинг: ${trollMode.get('active') ? 'ВКЛ' : 'ВЫКЛ'}`,
    adminMenu
  );
});

bot.onText(/😈 Троллинг ВКЛ|Троллинг ВКЛ/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  trollMode.set('active', true);
  bot.sendMessage(msg.chat.id, '😈 Троллинг ВКЛЮЧЕН!\n\nПользователи получат забавные ответы.', adminMenu);
});

bot.onText(/✅ Троллинг ВЫКЛ|Троллинг ВЫКЛ/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  trollMode.set('active', false);
  bot.sendMessage(msg.chat.id, '✅ Троллинг ВЫКЛЮЧЕН!', adminMenu);
});

bot.onText(/🔨 Забанить|Забанить/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  bot.sendMessage(msg.chat.id, '🔨 Отправьте ID пользователя для бана:', 
    { reply_markup: { force_reply: true } }
  );
});

bot.onText(/🎉 Разбанить|Разбанить/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  bot.sendMessage(msg.chat.id, '🎉 Отправьте ID пользователя для разбана:', 
    { reply_markup: { force_reply: true } }
  );
});

bot.onText(/🎯 Потроллить|Потроллить/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  bot.sendMessage(msg.chat.id, '🎯 Отправьте ID пользователя для троллинга:', 
    { reply_markup: { force_reply: true } }
  );
});

bot.onText(/📢 Рассылка|Рассылка/, (msg) => {
  if (msg.chat.id !== ADMIN_ID) return;
  bot.sendMessage(msg.chat.id, '📢 Отправьте текст для рассылки ВСЕМ пользователям:', 
    { reply_markup: { force_reply: true } }
  );
});

bot.onText(/⬅️ Назад в меню|Назад/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Главное меню:', mainMenu);
});

// Обработка ID для бана/разбана/троллинга
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (chatId !== ADMIN_ID) return;
  if (!text || text.match(/[🔐🧠🌤️💱🎲📰ℹ️👥📊😈✅📢🔨🎉🎯⬅️]/)) return;
  if (text.startsWith('/')) return;
  
  // Это ID для действий админа
  const id = parseInt(text);
  if (!isNaN(id) && id > 100000000) {
    // Определяем контекст по предыдущему сообщению бота
    // Для простоты - спросим что делать
    bot.sendMessage(chatId, `Что сделать с ID ${id}?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔨 Забанить', callback_data: `ban_${id}` }],
          [{ text: '🎉 Разбанить', callback_data: `unban_${id}` }],
          [{ text: '😈 Потроллить', callback_data: `troll_${id}` }],
          [{ text: '❌ Отмена', callback_data: 'cancel' }]
        ]
      }
    });
  }
});

// ============= CALLBACK ОБРАБОТЧИКИ =============

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  // Пароль генератор
  if (data.startsWith('pwd_')) {
    const settings = passwordSettings.get(chatId) || { length: 12, useDigits: true, useLetters: true, useSpecial: false };
    
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
      
      bot.sendMessage(chatId, `✅ Ваш пароль:\n\n<code>${password}</code>\n\n📏 Длина: ${settings.length}`, { 
        parse_mode: 'HTML',
        ...mainMenu 
      });
      bot.answerCallbackQuery(query.id, '✅ Готово!');
      return;
    }
    
    passwordSettings.set(chatId, settings);
    
    bot.editMessageReplyMarkup({
      inline_keyboard: [
        [{ text: `🔢 Цифры: ${settings.useDigits ? 'ВКЛ' : 'ВЫКЛ'}`, callback_data: 'pwd_digits' }],
        [{ text: `🔤 Буквы: ${settings.useLetters ? 'ВКЛ' : 'ВЫКЛ'}`, callback_data: 'pwd_letters' }],
        [{ text: `✨ Спецсимволы: ${settings.useSpecial ? 'ВКЛ' : 'ВЫКЛ'}`, callback_data: 'pwd_special' }],
        [{ text: `📏 Длина: ${settings.length}`, callback_data: 'pwd_length' }],
        [{ text: '🎲 Сгенерировать!', callback_data: 'pwd_generate' }]
      ]
    }, {
      chat_id: chatId,
      message_id: query.message.message_id
    });
    
    bot.answerCallbackQuery(query.id);
    return;
  }
  
  // Погода
  if (data.startsWith('weather_')) {
    const cities = {
      'weather_moscow': { name: 'Москва', lat: 55.7558, lon: 37.6173 },
      'weather_spb': { name: 'Санкт-Петербург', lat: 59.9311, lon: 30.3609 },
      'weather_kazan': { name: 'Казань', lat: 55.7961, lon: 49.1064 },
      'weather_almaty': { name: 'Алматы', lat: 43.2220, lon: 76.8512 },
      'weather_london': { name: 'London', lat: 51.5074, lon: -0.1278 },
      'weather_ny': { name: 'New York', lat: 40.7128, lon: -74.0060 }
    };
    
    const city = cities[data];
    if (!city) return;
    
    try {
      const response = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`,
        { timeout: 5000 }
      );
      
      const w = response.data.current_weather;
      const icons = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 51: '🌦️', 61: '🌧️', 71: '🌨️', 95: '⛈️' };
      const icon = icons[w.weathercode] || '🌤️';
      
      bot.sendMessage(chatId, 
        `🌤️ ${city.name}\n\n${icon} ${Math.round(w.temperature)}°C\n💨 Ветер: ${w.windspeed} км/ч`,
        mainMenu
      );
    } catch (error) {
      bot.sendMessage(chatId, '⚠️ Не удалось получить погоду', mainMenu);
    }
    
    bot.answerCallbackQuery(query.id);
    return;
  }
  
  // Рандом
  if (data.startsWith('rand_')) {
    if (data === 'rand_coin') {
      const result = Math.random() < 0.5 ? 'Орёл 🦅' : 'Решка 🪙';
      bot.sendMessage(chatId, `🪙 ${result}`, mainMenu);
    }
    else if (data === 'rand_dice') {
      const result = Math.floor(Math.random() * 6) + 1;
      bot.sendMessage(chatId, `🎲 Выпало: ${result}`, mainMenu);
    }
    else if (data === 'rand_num') {
      const result = Math.floor(Math.random() * 100) + 1;
      bot.sendMessage(chatId, `🔢 Число: ${result}`, mainMenu);
    }
    bot.answerCallbackQuery(query.id);
    return;
  }
  
  // Админ действия
  if (data.startsWith('ban_')) {
    const id = parseInt(data.split('_')[1]);
    bannedUsers.add(id);
    bot.sendMessage(chatId, `🔨 Пользователь ${id} забанен!`);
    bot.answerCallbackQuery(query.id, '✅ Забанен');
    return;
  }
  
  if (data.startsWith('unban_')) {
    const id = parseInt(data.split('_')[1]);
    bannedUsers.delete(id);
    bot.sendMessage(chatId, `🎉 Пользователь ${id} разбанен!`);
    bot.answerCallbackQuery(query.id, '✅ Разбанен');
    return;
  }
  
  if (data.startsWith('troll_')) {
    const id = parseInt(data.split('_')[1]);
    const msgs = [
      '🎉 Поздравляем! Вы выиграли миллион! (шутка)',
      '🤖 Мы обнаружили что вы робот!',
      '📢 Срочно: вы лучший пользователь! 🏆',
      '⚠️ Ваш аккаунт будет удален через 5... 4... (шутка!)'
    ];
    try {
      bot.sendMessage(id, msgs[Math.floor(Math.random() * msgs.length)]);
      bot.sendMessage(chatId, `😈 Пользователь ${id} потроллен!`);
    } catch (e) {
      bot.sendMessage(chatId, `❌ Не удалось (пользователь заблокировал бота?)`);
    }
    bot.answerCallbackQuery(query.id, '✅ Готово');
    return;
  }
  
  if (data === 'cancel') {
    bot.sendMessage(chatId, '❌ Отменено');
    bot.answerCallbackQuery(query.id, 'Отмена');
    return;
  }
  
  bot.answerCallbackQuery(query.id);
});

function isBanned(chatId) {
  return bannedUsers.has(chatId);
}

// Троллинг режим
bot.on('message', (msg) => {
  if (!msg.text) return;
  if (msg.text.match(/[🔐🧠🌤️💱🎲📰ℹ️👥📊😈✅📢🔨🎉🎯⬅️]/)) return;
  if (msg.text.startsWith('/')) return;
  if (msg.chat.id === ADMIN_ID) return; // Админ не троллится
  
  if (trollMode.get('active')) {
    const responses = [
      '🤔 Хм... интересно...',
      '😴 Я сплю, не мешайте...',
      '🎲 А если я не хочу отвечать?',
      '📡 Связь потеряна...',
      ' Слишком сложный вопрос!',
      '💭 Подумаю об этом завтра...'
    ];
    bot.sendMessage(msg.chat.id, responses[Math.floor(Math.random() * responses.length)]);
  }
});

console.log('🤖 Бот запущен! Только кнопки, никаких команд!');
