from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from keyboards.admin_kb import admin_panel, confirm_broadcast, ban_menu
from utils.states import AdminBroadcast, AdminBanUser, AdminUnbanUser, AdminSetKey
import config, db

router = Router()

def is_admin(user_id: int) -> bool:
    return user_id == config.ADMIN_ID

# Admin entry
@router.message(Command("admin"))
async def cmd_admin(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("❌ Недостаточно прав.")
        return
    await message.answer("🔧 <b>Админ-панель</b>", reply_markup=admin_panel())

@router.callback_query(F.data == "admin_panel")
async def admin_panel_cb(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет прав")
        return
    await callback.message.edit_text("🔧 <b>Админ-панель</b>", reply_markup=admin_panel())

# Stats
@router.callback_query(F.data == "admin_stats")
async def admin_stats(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        return
    stats = await db.get_stats()
    users = await db.get_all_users()
    total_users = len(users)
    banned = sum(1 for u in users if u.get("is_banned"))
    text = (
        f"📊 <b>Статистика</b>\n\n"
        f"👥 Всего пользователей: {total_users}\n"
        f"🚫 Забанено: {banned}\n"
    )
    if stats:
        text += "\n📈 <b>Активность по дням:</b>\n"
        for s in stats[:7]:
            text += f"  {s['date']}: {s.get('messages_count',0)} msg, {s.get('new_users',0)} new\n"
    await callback.message.edit_text(text, reply_markup=admin_panel())

# User list
@router.callback_query(F.data == "admin_user_list")
async def admin_user_list(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        return
    users = await db.get_all_users()
    if not users:
        await callback.message.edit_text("Нет пользователей.", reply_markup=admin_panel())
        return
    text = "📋 <b>Пользователи</b>\n\n"
    for u in users[:50]:
        status = "🚫" if u.get("is_banned") else "✅"
        text += f"{status} <code>{u['tg_id']}</code> | {u['full_name']}\n"
    if len(users) > 50:
        text += f"\n...и еще {len(users)-50}"
    await callback.message.edit_text(text, reply_markup=admin_panel())

# Broadcast
@router.callback_query(F.data == "admin_broadcast")
async def admin_broadcast_cb(callback: CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id):
        return
    await callback.message.edit_text("📢 Введи текст для рассылки всем пользователям:")
    await state.set_state(AdminBroadcast.message)

@router.message(AdminBroadcast.message)
async def admin_broadcast_msg(message: Message, state: FSMContext):
    await state.update_data(msg=message.text)
    await message.answer(
        f"📢 Подтверди рассылку:\n\n{message.text[:500]}",
        reply_markup=confirm_broadcast()
    )

@router.callback_query(F.data == "confirm_broadcast")
async def admin_broadcast_confirm(callback: CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id):
        return
    data = await state.get_data()
    await state.clear()
    text = data.get("msg", "")
    users = await db.get_all_users()
    sent = 0
    for u in users:
        if u.get("is_banned"):
            continue
        try:
            await callback.bot.send_message(u["tg_id"], text)
            sent += 1
        except Exception:
            pass
    await callback.message.edit_text(f"✅ Рассылка завершена. Отправлено: {sent}", reply_markup=admin_panel())

# Ban menu
@router.callback_query(F.data == "admin_ban_menu")
async def admin_ban_menu_cb(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        return
    await callback.message.edit_text("🚫 Выбери действие:", reply_markup=ban_menu())

@router.callback_query(F.data == "admin_ban")
async def admin_ban_cb(callback: CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id):
        return
    await callback.message.edit_text("🚫 Введи TG ID пользователя для бана:")
    await state.set_state(AdminBanUser.user_id)

@router.callback_query(F.data == "admin_unban")
async def admin_unban_cb(callback: CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id):
        return
    await callback.message.edit_text("✅ Введи TG ID пользователя для разбана:")
    await state.set_state(AdminUnbanUser.user_id)

@router.message(AdminBanUser.user_id)
async def admin_ban_user(message: Message, state: FSMContext):
    try:
        uid = int(message.text)
    except ValueError:
        await message.answer("❌ Нужен числовой ID.")
        return
    await db.ban_user(uid)
    await state.clear()
    await message.answer(f"🚫 Пользователь {uid} забанен.", reply_markup=admin_panel())

@router.message(AdminUnbanUser.user_id)
async def admin_unban_user(message: Message, state: FSMContext):
    try:
        uid = int(message.text)
    except ValueError:
        await message.answer("❌ Нужен числовой ID.")
        return
    await db.unban_user(uid)
    await state.clear()
    await message.answer(f"✅ Пользователь {uid} разбанен.", reply_markup=admin_panel())

# Set AI key
@router.callback_query(F.data == "admin_set_key")
async def admin_set_key_cb(callback: CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id):
        return
    await callback.message.edit_text("🔑 Введи новый OpenRouter API ключ:")
    await state.set_state(AdminSetKey.key)

@router.message(AdminSetKey.key)
async def admin_set_key_msg(message: Message, state: FSMContext):
    await db.set_setting("openrouter_key", message.text.strip())
    await state.clear()
    await message.answer("✅ AI API ключ обновлен.", reply_markup=admin_panel())
