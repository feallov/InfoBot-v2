from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from keyboards.admin_kb import troll_menu, admin_panel
from utils.states import TrollState, TrollFakeSystem, TrollFakeWeather
from utils.troll_utils import (
    zalgo_text, reverse_text, mocking_text, glitch_text,
    fake_system_message, fake_hacked_message, fake_lottery_message,
    fake_ban_message, fake_update_message
)
import config, db

router = Router()

def is_admin(user_id: int) -> bool:
    return user_id == config.ADMIN_ID

@router.callback_query(F.data == "admin_troll_menu")
async def troll_menu_cb(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет прав")
        return
    await callback.message.edit_text("😈 <b>Троллинг-меню</b>\n\nВыбери тип розыгрыша:", reply_markup=troll_menu())

# Generic flow for text-based trolls
async def start_troll_text(callback: CallbackQuery, state: FSMContext, troll_type: str):
    await state.update_data(troll_type=troll_type)
    await callback.message.edit_text("🎯 Введи TG ID жертвы:")
    await state.set_state(TrollState.target_id)

@router.callback_query(F.data.startswith("troll_"))
async def troll_type_cb(callback: CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет прав")
        return
    data = callback.data
    if data == "troll_zalgo":
        await start_troll_text(callback, state, "zalgo")
    elif data == "troll_reverse":
        await start_troll_text(callback, state, "reverse")
    elif data == "troll_mocking":
        await start_troll_text(callback, state, "mocking")
    elif data == "troll_glitch":
        await start_troll_text(callback, state, "glitch")
    elif data == "troll_system":
        await callback.message.edit_text("⚠️ Введи TG ID жертвы:")
        await state.set_state(TrollFakeSystem.target_id)
    elif data == "troll_hacked":
        await callback.message.edit_text("🎯 Введи TG ID жертвы:")
        await state.set_state(TrollState.target_id)
        await state.update_data(troll_type="hacked", need_text=False)
    elif data == "troll_lottery":
        await callback.message.edit_text("🎯 Введи TG ID жертвы:")
        await state.set_state(TrollState.target_id)
        await state.update_data(troll_type="lottery", need_text=False)
    elif data == "troll_ban":
        await callback.message.edit_text("🎯 Введи TG ID жертвы:")
        await state.set_state(TrollState.target_id)
        await state.update_data(troll_type="ban", need_text=False)
    elif data == "troll_update":
        await callback.message.edit_text("🎯 Введи TG ID жертвы:")
        await state.set_state(TrollState.target_id)
        await state.update_data(troll_type="update", need_text=False)
    elif data == "troll_fake_weather":
        await callback.message.edit_text("🌤 Введи TG ID жертвы:")
        await state.set_state(TrollFakeWeather.target_id)

@router.message(TrollState.target_id)
async def troll_target_id(message: Message, state: FSMContext):
    try:
        uid = int(message.text)
    except ValueError:
        await message.answer("❌ Нужен числовой ID.")
        return
    data = await state.get_data()
    need_text = data.get("need_text", True)
    await state.update_data(target_id=uid)
    if need_text:
        await message.answer("✏️ Введи текст, который отправим жертве:")
        await state.set_state(TrollState.text)
    else:
        await send_troll(message, state)

@router.message(TrollState.text)
async def troll_text(message: Message, state: FSMContext):
    await state.update_data(text=message.text)
    await send_troll(message, state)

async def send_troll(message: Message, state: FSMContext):
    data = await state.get_data()
    await state.clear()
    uid = data.get("target_id")
    troll_type = data.get("troll_type")
    text = data.get("text", "")
    try:
        if troll_type == "zalgo":
            await message.bot.send_message(uid, zalgo_text(text))
        elif troll_type == "reverse":
            await message.bot.send_message(uid, reverse_text(text))
        elif troll_type == "mocking":
            await message.bot.send_message(uid, mocking_text(text))
        elif troll_type == "glitch":
            await message.bot.send_message(uid, glitch_text(text))
        elif troll_type == "hacked":
            await message.bot.send_message(uid, fake_hacked_message())
        elif troll_type == "lottery":
            await message.bot.send_message(uid, fake_lottery_message())
        elif troll_type == "ban":
            await message.bot.send_message(uid, fake_ban_message())
        elif troll_type == "update":
            await message.bot.send_message(uid, fake_update_message())
        else:
            await message.bot.send_message(uid, text)
        await message.answer(f"✅ Троллинг отправлен {uid}", reply_markup=admin_panel())
    except Exception as e:
        await message.answer(f"❌ Ошибка отправки: {e}", reply_markup=admin_panel())

# Fake system
@router.message(TrollFakeSystem.target_id)
async def troll_system_target(message: Message, state: FSMContext):
    try:
        uid = int(message.text)
    except ValueError:
        await message.answer("❌ Нужен числовой ID.")
        return
    await state.update_data(target_id=uid)
    await message.answer("✏️ Введи текст системного уведомления:")
    await state.set_state(TrollFakeSystem.text)

@router.message(TrollFakeSystem.text)
async def troll_system_text(message: Message, state: FSMContext):
    data = await state.get_data()
    await state.clear()
    uid = data.get("target_id")
    text = fake_system_message(message.text)
    try:
        await message.bot.send_message(uid, text)
        await message.answer("✅ Фейковое системное сообщение отправлено.", reply_markup=admin_panel())
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}", reply_markup=admin_panel())

# Fake weather
@router.message(TrollFakeWeather.target_id)
async def troll_fw_target(message: Message, state: FSMContext):
    try:
        uid = int(message.text)
    except ValueError:
        await message.answer("❌ Нужен числовой ID.")
        return
    await state.update_data(target_id=uid)
    await message.answer("🌍 Введи название города для фейкового прогноза:")
    await state.set_state(TrollFakeWeather.city)

@router.message(TrollFakeWeather.city)
async def troll_fw_city(message: Message, state: FSMContext):
    await state.update_data(city=message.text)
    await message.answer("☁️ Введи описание погоды (любое, например 'сильный метеоритный дождь')")
    await state.set_state(TrollFakeWeather.description)

@router.message(TrollFakeWeather.description)
async def troll_fw_desc(message: Message, state: FSMContext):
    data = await state.get_data()
    await state.clear()
    uid = data.get("target_id")
    city = data.get("city")
    desc = message.text
    text = (
        f"🌍 <b>{city}</b>\n"
        f"🌡 Температура: <b>+{hash(city) % 40}°C</b>\n"
        f"☁️ {desc.capitalize()}\n"
        f"💧 Влажность: {hash(desc) % 100}%\n"
        f"💨 Ветер: {(hash(city+desc) % 20)} м/с\n\n"
        f"<i>Проверь настоящий прогноз, это мог быть просто розыгрыш 😈</i>"
    )
    try:
        await message.bot.send_message(uid, text)
        await message.answer("✅ Фейковая погода отправлена.", reply_markup=admin_panel())
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}", reply_markup=admin_panel())
