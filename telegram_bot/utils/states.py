from aiogram.fsm.state import State, StatesGroup

class WeatherState(StatesGroup):
    city = State()

class AIChatState(StatesGroup):
    chatting = State()

class ReminderState(StatesGroup):
    text = State()
    time = State()

class AdminBroadcast(StatesGroup):
    message = State()

class AdminBanUser(StatesGroup):
    user_id = State()

class AdminUnbanUser(StatesGroup):
    user_id = State()

class AdminBan(StatesGroup):
    user_id = State()

class AdminSetKey(StatesGroup):
    key = State()

class TrollState(StatesGroup):
    target_id = State()
    text = State()
    choose_type = State()

class TrollFakeSystem(StatesGroup):
    target_id = State()
    text = State()

class TrollFakeWeather(StatesGroup):
    target_id = State()
    city = State()
    description = State()
