import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "8986252320:AAFSOFrswuhs2eiGHJMY8Ie3IC5qjJG2sHw")
ADMIN_ID = int(os.getenv("ADMIN_ID", "7220300785"))
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "5c8dca5928cec7d66c226df2402bca12")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
BOT_NAME = os.getenv("BOT_NAME", "UltimateBot")
DATABASE_PATH = os.getenv("DATABASE_PATH", "bot.db")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_AI_MODEL = "deepseek/deepseek-chat:free"

ADMIN_COMMANDS = [
    ("admin", "Админ-панель"),
    ("stats", "Статистика бота"),
    ("broadcast", "Рассылка всем"),
    ("ban", "Забанить пользователя"),
    ("unban", "Разбанить пользователя"),
    ("set_ai_key", "Установить AI API ключ"),
    ("troll", "Троллинг меню"),
    ("fake_system", "Фейковое системное сообщение"),
]
