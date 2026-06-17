import aiosqlite
from datetime import datetime, timedelta
import config

async def init_db():
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tg_id INTEGER UNIQUE NOT NULL,
                username TEXT,
                full_name TEXT,
                created_at TEXT NOT NULL,
                is_banned INTEGER DEFAULT 0
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                remind_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bot_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                messages_count INTEGER DEFAULT 0,
                new_users INTEGER DEFAULT 0
            )
        """)
        await db.commit()

async def add_user(tg_id: int, username: str, full_name: str):
    now = datetime.now().isoformat()
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO users (tg_id, username, full_name, created_at) VALUES (?, ?, ?, ?)",
            (tg_id, username, full_name, now)
        )
        await db.commit()

async def get_user(tg_id: int):
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users WHERE tg_id = ?", (tg_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def get_all_users():
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def ban_user(tg_id: int):
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        await db.execute("UPDATE users SET is_banned = 1 WHERE tg_id = ?", (tg_id,))
        await db.commit()

async def unban_user(tg_id: int):
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        await db.execute("UPDATE users SET is_banned = 0 WHERE tg_id = ?", (tg_id,))
        await db.commit()

async def add_reminder(user_id: int, text: str, remind_at: datetime):
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        await db.execute(
            "INSERT INTO reminders (user_id, text, remind_at, created_at) VALUES (?, ?, ?, ?)",
            (user_id, text, remind_at.isoformat(), datetime.now().isoformat())
        )
        await db.commit()

async def get_due_reminders(now: datetime):
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM reminders WHERE remind_at <= ?", (now.isoformat(),)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def delete_reminder(reminder_id: int):
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        await db.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
        await db.commit()

async def get_user_reminders(user_id: int):
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_at", (user_id,)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def set_setting(key: str, value: str):
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)",
            (key, value)
        )
        await db.commit()

async def get_setting(key: str, default: str = ""):
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        async with db.execute("SELECT value FROM bot_settings WHERE key = ?", (key,)) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else default

async def increment_messages():
    today = datetime.now().strftime("%Y-%m-%d")
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        await db.execute(
            """INSERT INTO stats (date, messages_count) VALUES (?, 1)
            ON CONFLICT(date) DO UPDATE SET messages_count = messages_count + 1""",
            (today,)
        )
        await db.commit()

async def increment_new_users():
    today = datetime.now().strftime("%Y-%m-%d")
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        await db.execute(
            """INSERT INTO stats (date, new_users) VALUES (?, 1)
            ON CONFLICT(date) DO UPDATE SET new_users = new_users + 1""",
            (today,)
        )
        await db.commit()

async def get_stats():
    async with aiosqlite.connect(config.DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM stats ORDER BY date DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
