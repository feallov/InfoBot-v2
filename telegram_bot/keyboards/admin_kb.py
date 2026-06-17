from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

def admin_panel():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📊 Статистика", callback_data="admin_stats")],
        [InlineKeyboardButton(text="📢 Рассылка", callback_data="admin_broadcast")],
        [InlineKeyboardButton(text="🚫 Бан/Разбан", callback_data="admin_ban_menu")],
        [InlineKeyboardButton(text="🔑 AI API ключ", callback_data="admin_set_key")],
        [InlineKeyboardButton(text="😈 Троллинг", callback_data="admin_troll_menu")],
        [InlineKeyboardButton(text="📋 Список юзеров", callback_data="admin_user_list")],
        [InlineKeyboardButton(text="⬅️ Главное меню", callback_data="main_menu")]
    ])

def troll_menu():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🤪 Zalgo текст", callback_data="troll_zalgo")],
        [InlineKeyboardButton(text="🔁 Reverse текст", callback_data="troll_reverse")],
        [InlineKeyboardButton(text="🦞 Mocking текст", callback_data="troll_mocking")],
        [InlineKeyboardButton(text="👾 Glitch текст", callback_data="troll_glitch")],
        [InlineKeyboardButton(text="⚠️ Фейк системное", callback_data="troll_system")],
        [InlineKeyboardButton(text="🚨 Фейк взлом", callback_data="troll_hacked")],
        [InlineKeyboardButton(text="🎉 Фейк лотерея", callback_data="troll_lottery")],
        [InlineKeyboardButton(text="🚫 Фейк бан", callback_data="troll_ban")],
        [InlineKeyboardButton(text="🔄 Фейк обновление", callback_data="troll_update")],
        [InlineKeyboardButton(text="🌤 Фейк погода", callback_data="troll_fake_weather")],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="admin_panel")]
    ])

def ban_menu():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚫 Забанить", callback_data="admin_ban")],
        [InlineKeyboardButton(text="✅ Разбанить", callback_data="admin_unban")],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="admin_panel")]
    ])

def confirm_broadcast():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Отправить", callback_data="confirm_broadcast")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="admin_panel")]
    ])
