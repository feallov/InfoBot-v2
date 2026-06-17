import random
import string

ZALGO_CHARS = [
    "\u0300", "\u0301", "\u0302", "\u0303", "\u0304", "\u0305", "\u0306",
    "\u0307", "\u0308", "\u0309", "\u030A", "\u030B", "\u030C", "\u030D",
    "\u030E", "\u030F", "\u0310", "\u0311", "\u0312", "\u0313", "\u0314",
    "\u0315", "\u0316", "\u0317", "\u0318", "\u0319", "\u031A", "\u031B",
    "\u031C", "\u031D", "\u031E", "\u031F", "\u0320", "\u0321", "\u0322",
    "\u0323", "\u0324", "\u0325", "\u0326", "\u0327", "\u0328", "\u0329",
    "\u032A", "\u032B", "\u032C", "\u032D", "\u032E", "\u032F", "\u0330",
    "\u0331", "\u0332", "\u0333", "\u0334", "\u0335", "\u0336", "\u0337",
    "\u0338", "\u0339", "\u033A", "\u033B", "\u033C", "\u033D", "\u033E",
    "\u033F", "\u0340", "\u0341", "\u0342", "\u0343", "\u0344", "\u0345",
    "\u0346", "\u0347", "\u0348", "\u0349", "\u034A", "\u034B", "\u034C",
    "\u034D", "\u034E", "\u034F", "\u0350", "\u0351", "\u0352", "\u0353",
    "\u0354", "\u0355", "\u0356", "\u0357", "\u0358", "\u0359", "\u035A",
    "\u035B", "\u035C", "\u035D", "\u035E", "\u035F", "\u0360", "\u0361",
    "\u0362", "\u0363", "\u0364", "\u0365", "\u0366", "\u0367", "\u0368",
    "\u0369", "\u036A", "\u036B", "\u036C", "\u036D", "\u036E", "\u036F"
]

def zalgo_text(text: str, intensity: int = 5) -> str:
    result = []
    for char in text:
        result.append(char)
        for _ in range(random.randint(1, intensity)):
            result.append(random.choice(ZALGO_CHARS))
    return "".join(result)

def reverse_text(text: str) -> str:
    return text[::-1]

def mocking_text(text: str) -> str:
    result = []
    for i, ch in enumerate(text):
        if ch.isalpha():
            result.append(ch.upper() if i % 2 == 0 else ch.lower())
        else:
            result.append(ch)
    return "".join(result)

def glitch_text(text: str) -> str:
    glitches = ["̷", "̸", "̶", "̢", "̡", "̖", "̗", "̮", "̭", "̼", "͚", "̻"]
    return "".join(random.choice(glitches) + ch for ch in text)

def fake_system_message(text: str) -> str:
    return (
        f"⚠️ <b>Системное уведомление Telegram</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"{text}\n"
        f"━━━━━━━━━━━━━━━━━━━━━\n"
        f"<i>Если вы считаете, что это ошибка, обратитесь в поддержку.</i>"
    )

def fake_hacked_message() -> str:
    return (
        "🚨 <b>ВНИМАНИЕ: ОБНАРУЖЕНА ПОДОЗРИТЕЛЬНАЯ АКТИВНОСТЬ</b>\n\n"
        "Ваш аккаунт был взломан группировкой <code>0xDEADBEEF</code>.\n"
        "Все ваши данные скопированы на сервер <b>127.0.0.1</b>.\n\n"
        "🔓 <b>Действия злоумышленника:</b>\n"
        "  • Смена пароля: ЗАВЕРШЕНО\n"
        "  • Отправка диетической колбасы вашей маме: ЗАВЕРШЕНО\n"
        "  • Удаление 2 сообщений: ЗАВЕРШЕНО\n\n"
        "<i>Шучу, это просто розыгрыш 😈</i>"
    )

def fake_lottery_message() -> str:
    prizes = ["iPhone 15 Pro Max", "1000000 рублей", "подписку Telegram Premium на 100 лет", "корзину свежих мемов"]
    prize = random.choice(prizes)
    return (
        f"🎉 <b>ПОЗДРАВЛЯЕМ!</b>\n\n"
        f"Вы стали <b>1000000</b>-м пользователем этого бота!\n"
        f"Ваш выигрыш: <b>{prize}</b>!\n\n"
        f"Для получения приза отправьте свои банковские реквизиты на адрес...\n\n"
        f"<i>Шутка. Никому не отправляйте реквизиты 😂</i>"
    )

def fake_ban_message() -> str:
    return (
        "🚫 <b>Ваш аккаунт заблокирован</b>\n\n"
        "Причина: <i>превышен лимит смеха в чате.</i>\n\n"
        "Разблокировка произойдет через 10 лет...\n"
        "<i>Или прямо сейчас, если вы дочитали до конца 😄</i>"
    )

def fake_update_message() -> str:
    return (
        "🔄 <b>Telegram обновление 10.0.0</b>\n\n"
        "Ваше устройство устарело и не поддерживает новые стикеры с фруктами.\n\n"
        "Рекомендуем обновить телефон до iPhone 30 или Android 25.\n\n"
        "<i>А на самом деле всё работает, не парься.</i>"
    )
