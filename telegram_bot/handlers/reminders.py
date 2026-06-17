from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.filters import Command
from datetime import datetime, timedelta
from utils.states import ReminderState
import db
from keyboards.main_menu import main_menu, back_to_main

router = Router()

@router.callback_query(F.data == "reminders")
async def reminders_cb(callback: CallbackQuery):
    rems = await db.get_user_reminders(callback.from_user.id)
    if not rems:
        text = "⏰ У тебя нет напоминаний."
    else:
        text = "⏰ <b>Твои напоминалки:</b>\n\n"
        for r in rems:
            text += f"  • {r['id']}: {r['text']} (в {r['remind_at'][:16]})\n"
    kb = {
        "inline_keyboard": [
            [{"text": "➕ Добавить", "callback_data": "add_reminder"}],
            [{"text": "⬅️ Назад", "callback_data": "main_menu"}]
        ]
    }
    from aiogram.types import InlineKeyboardMarkup
    await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(**kb))

@router.callback_query(F.data == "add_reminder")
async def add_reminder_cb(callback: CallbackQuery, state: FSMContext):
    await callback.message.edit_text("✏️ Введи текст напоминания:")
    await state.set_state(ReminderState.text)

@router.message(ReminderState.text)
async def reminder_text(message: Message, state: FSMContext):
    await state.update_data(text=message.text)
    await message.answer(
        "⏳ Через сколько минут напомнить? (введи число):"
    )
    await state.set_state(ReminderState.time)

@router.message(ReminderState.time)
async def reminder_time(message: Message, state: FSMContext):
    try:
        minutes = int(message.text)
        if minutes <= 0 or minutes > 10080:
            await message.answer("❌ Введи число от 1 до 10080 (неделя).")
            return
    except ValueError:
        await message.answer("❌ Нужно число.")
        return
    data = await state.get_data()
    remind_at = datetime.now() + timedelta(minutes=minutes)
    await db.add_reminder(message.from_user.id, data["text"], remind_at)
    await state.clear()
    await message.answer(
        f"✅ Напоминание установлено на {remind_at.strftime('%H:%M %d.%m.%Y')}",
        reply_markup=main_menu()
    )
