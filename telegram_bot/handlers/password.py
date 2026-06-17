from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
import secrets, string

router = Router()

def generate_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def pass_kb():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="8 символов", callback_data="gen_pass_8")],
        [InlineKeyboardButton(text="12 символов", callback_data="gen_pass_12")],
        [InlineKeyboardButton(text="16 символов", callback_data="gen_pass_16")],
        [InlineKeyboardButton(text="20 символов", callback_data="gen_pass_20")],
        [InlineKeyboardButton(text="⬅️ Назад", callback_data="main_menu")]
    ])

@router.callback_query(F.data == "password")
async def password_cb(callback: CallbackQuery):
    await callback.message.edit_text(
        "🔐 <b>Генератор паролей</b>\n\nВыбери длину:",
        reply_markup=pass_kb()
    )

@router.callback_query(F.data.startswith("gen_pass_"))
async def gen_pass_cb(callback: CallbackQuery):
    length = int(callback.data.split("_")[-1])
    pwd = generate_password(length)
    await callback.message.edit_text(
        f"🔐 <b>Новый пароль:</b> <code>{pwd}</code>\n\n"
        f"Длина: {length} символов\n"
        f"Скопируй его и сохрани в надежном месте!",
        reply_markup=pass_kb()
    )
