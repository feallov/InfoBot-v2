import asyncio
import logging
import os
import sys

from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, Update
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiogram.client.default import DefaultBotProperties
from aiohttp import web

import config
import db
from utils.scheduler import start_scheduler

from handlers import start, weather, ai_chat, reminders, password, admin, troll

logging.basicConfig(level=logging.INFO, stream=sys.stdout)

bot = Bot(token=config.BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
storage = MemoryStorage()
dp = Dispatcher(storage=storage)

# Include routers
dp.include_routers(
    start.router,
    weather.router,
    ai_chat.router,
    reminders.router,
    password.router,
    admin.router,
    troll.router,
)

# Middleware: ban check + stats
@dp.message.middleware()
async def ban_and_stats_middleware(handler, event, data):
    if isinstance(event, Message):
        user = await db.get_user(event.from_user.id)
        if user and user.get("is_banned"):
            await event.answer("🚫 Вы заблокированы.")
            return None
        await db.increment_messages()
    return await handler(event, data)

@dp.callback_query.middleware()
async def ban_cb_middleware(handler, event, data):
    from aiogram.types import CallbackQuery
    if isinstance(event, CallbackQuery):
        user = await db.get_user(event.from_user.id)
        if user and user.get("is_banned"):
            await event.answer("🚫 Вы заблокированы.", show_alert=True)
            return None
    return await handler(event, data)

async def on_startup():
    await db.init_db()
    start_scheduler(bot)
    logging.info("Bot started. Admin ID: %s", config.ADMIN_ID)

async def main():
    await on_startup()
    webhook_url = os.getenv("WEBHOOK_URL")
    if webhook_url:
        await bot.set_webhook(url=webhook_url, drop_pending_updates=True)
        app = web.Application()
        async def health(request):
            return web.Response(text="Bot is running")
        app.router.add_get("/", health)
        webhook_requests_handler = SimpleRequestHandler(dispatcher=dp, bot=bot)
        webhook_requests_handler.register(app, path="/webhook")
        setup_application(app, dp, bot=bot)
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, host="0.0.0.0", port=int(os.getenv("PORT", 8080)))
        await site.start()
        logging.info("Webhook server started on port %s", os.getenv("PORT", 8080))
        while True:
            await asyncio.sleep(3600)
    else:
        await dp.start_polling(bot, skip_updates=True)

if __name__ == "__main__":
    asyncio.run(main())
