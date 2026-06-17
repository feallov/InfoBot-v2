import aiohttp
import config
import db

async def get_ai_response(user_text: str) -> str:
    api_key = await db.get_setting("openrouter_key", config.OPENROUTER_API_KEY)
    if not api_key:
        return "❌ AI API ключ не установлен. Попроси администратора установить его в админ-панели."
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://t.me/ultimate_bot",
        "X-Title": "UltimateBot"
    }
    payload = {
        "model": config.DEFAULT_AI_MODEL,
        "messages": [
            {"role": "system", "content": "Ты полезный AI-ассистент в Telegram-боте. Отвечай кратко, по делу, на русском языке."},
            {"role": "user", "content": user_text}
        ]
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{config.OPENROUTER_BASE_URL}/chat/completions", headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    return f"⚠️ Ошибка AI ({resp.status}): {text[:200]}"
                data = await resp.json()
                choices = data.get("choices", [])
                if not choices:
                    return "⚠️ AI не вернул ответ."
                return choices[0]["message"]["content"]
    except Exception as e:
        return f"⚠️ Ошибка сети: {e}"
