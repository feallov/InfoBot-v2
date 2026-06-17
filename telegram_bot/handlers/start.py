from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command
import db
from keyboards.main_menu import main_menu, back_to_main
import config

router = Router()

@router.message(Command("start"))
async def cmd_start(message: Message):
    user = await db.get_user(message.from_user.id)
    if user and user.get("is_banned"):
        await message.answer("🚫 Вы заблокированы.")
        return
    await db.add_user(
        tg_id=message.from_user.id,
        username=message.from_user.username or "",
        full_name=message.from_user.full_name or ""
    )
    await db.increment_new_users()
    await message.answer(
        f"👋 Привет, <b>{message.from_user.full_name}</b>!\n\n"
        f"Добро пожаловать в <b>{config.BOT_NAME}</b>.\n"
        f"Выбери функцию ниже:",
        reply_markup=main_menu()
    )

@router.callback_query(F.data == "main_menu")
async def main_menu_cb(callback: CallbackQuery):
    await callback.message.edit_text(
        f"👋 Снова здесь, <b>{callback.from_user.full_name}</b>!\n\n"
        f"Выбери функцию:",
        reply_markup=main_menu()
    )

@router.callback_query(F.data == "profile")
async def profile_cb(callback: CallbackQuery):
    user = await db.get_user(callback.from_user.id)
    if not user:
        await callback.answer("Пользователь не найден")
        return
    reminders = await db.get_user_reminders(callback.from_user.id)
    text = (
        f"👤 <b>Профиль</b>\n\n"
        f"🆔 ID: <code>{user['tg_id']}</code>\n"
        f"📛 Имя: {user['full_name']}\n"
        f"🔑 Username: @{user['username'] or 'нет'}\n"
        f"📅 Регистрация: {user['created_at'][:10]}\n"
        f"⏰ Активных напоминаний: {len(reminders)}\n"
    )
    if callback.from_user.id == config.ADMIN_ID:
        text += "\n🔴 <b>Вы администратор!</b>\nИспользуйте /admin"
    await callback.message.edit_text(text, reply_markup=back_to_main())
