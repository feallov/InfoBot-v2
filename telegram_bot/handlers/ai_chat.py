from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from utils.states import AIChatState
from utils.ai_client import get_ai_response
from keyboards.main_menu import main_menu, back_to_main

router = Router()

@router.callback_query(F.data == "ai_chat")
async def ai_chat_cb(callback: CallbackQuery, state: FSMContext):
    await callback.message.edit_text(
        "🤖 <b>AI Чат</b>\n\n"
        "Напиши мне что угодно, я отвечу через нейросеть.\n"
        "Для выхода отправь /exit или нажми кнопку.",
        reply_markup=back_to_main()
    )
    await state.set_state(AIChatState.chatting)

@router.message(AIChatState.chatting, Command("exit"))
async def exit_ai(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("👋 Вышел из AI чата.", reply_markup=main_menu())

@router.message(AIChatState.chatting, F.text)
async def ai_chat_message(message: Message, state: FSMContext):
    processing = await message.answer("🧠 Думаю...")
    response = await get_ai_response(message.text)
    await processing.edit_text(response, reply_markup=back_to_main())
