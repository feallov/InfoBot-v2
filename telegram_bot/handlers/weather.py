from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from utils.states import WeatherState
from utils.weather_client import get_weather
from keyboards.main_menu import back_to_main

router = Router()

@router.callback_query(F.data == "weather")
async def weather_cb(callback: CallbackQuery, state: FSMContext):
    await callback.message.edit_text("🌍 Введи название города:", reply_markup=back_to_main())
    await state.set_state(WeatherState.city)

@router.message(WeatherState.city)
async def weather_city(message: Message, state: FSMContext):
    await state.clear()
    msg = await message.answer("🌤 Загружаю погоду...")
    text, error = await get_weather(message.text)
    if error:
        await msg.edit_text(f"❌ Ошибка: {error}", reply_markup=back_to_main())
    else:
        await msg.edit_text(text, reply_markup=back_to_main())
