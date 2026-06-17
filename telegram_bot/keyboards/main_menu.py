from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

def main_menu():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🌤 Погода", callback_data="weather")],
        [InlineKeyboardButton(text="🤖 AI Чат", callback_data="ai_chat")],
        [InlineKeyboardButton(text="⏰ Напоминалки", callback_data="reminders")],
        [InlineKeyboardButton(text="🔐 Генератор паролей", callback_data="password")],
        [InlineKeyboardButton(text="⚙️ Профиль", callback_data="profile")]
    ])

def back_to_main():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="main_menu")]
    ])
