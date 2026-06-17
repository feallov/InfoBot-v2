from apscheduler.schedulers.asyncio import AsyncIOScheduler
from aiogram import Bot
import db
from datetime import datetime, timedelta
import config

scheduler = AsyncIOScheduler()

async def check_reminders(bot: Bot):
    now = datetime.now()
    reminders = await db.get_due_reminders(now)
    for rem in reminders:
        try:
            await bot.send_message(
                rem["user_id"],
                f"⏰ <b>Напоминание!</b>\n\n{rem['text']}",
                parse_mode="HTML"
            )
            await db.delete_reminder(rem["id"])
        except Exception as e:
            print(f"Failed to send reminder {rem['id']}: {e}")

def start_scheduler(bot: Bot):
    scheduler.add_job(check_reminders, "interval", seconds=30, args=[bot], id="reminders")
    scheduler.start()
