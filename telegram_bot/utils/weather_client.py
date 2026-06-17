import aiohttp
import config

async def get_weather(city: str):
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "q": city,
        "appid": config.WEATHER_API_KEY,
        "units": "metric",
        "lang": "ru"
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as resp:
            data = await resp.json()
            if resp.status != 200:
                return None, data.get("message", "Ошибка")
            weather = data["weather"][0]["description"]
            temp = data["main"]["temp"]
            feels_like = data["main"]["feels_like"]
            humidity = data["main"]["humidity"]
            wind = data["wind"]["speed"]
            city_name = data["name"]
            text = (
                f"🌍 <b>{city_name}</b>\n"
                f"🌡 Температура: <b>{temp}°C</b> (ощущается {feels_like}°C)\n"
                f"☁️ {weather.capitalize()}\n"
                f"💧 Влажность: {humidity}%\n"
                f"💨 Ветер: {wind} м/с"
            )
            return text, None
