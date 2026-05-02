# 🤖 LOLA Discord Bot — Инструкция по настройке

## 📋 Что делает бот

- 🎧 **+1 XP каждые 60 сек** в голосовом канале
- 💬 **+1-3 XP за сообщение** (кд 3 мин)
- 📊 **Автоматическая синхронизация** с сайтом каждые 5 мин
- 🏆 Команды `/rank` и `/leaderboard`
- 🔄 Команда `/sync` — ручной flush XP

---

## Шаг 1: Перегенерируй токен бота! ⚠️

Твой текущий токен скомпрометирован. Перегенерируй:

1. Зайди на [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Выбери приложение **1491432296048361551**
3. Слева → **Bot**
4. Прокрути вниз → кнопка **Reset Token**
5. Подтверди → скопируй **НОВЫЙ** токен

---

## Шаг 2: Настрой .env файл

1. В папке `bot/` создай файл `.env`:
   ```
   cp .env.example .env
   ```
   Или просто переименуй `.env.example` → `.env`

2. Открой `.env` и заполни:

   ```
   DISCORD_TOKEN=вставь_новый_токен_сюда
   CLIENT_ID=1491432296048361551
   GUILD_ID=1463228311118549124
   SUPABASE_URL=https://твой-проект.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=твой_service_role_key
   ```

   **Где взять Supabase URL:**
   - Supabase Dashboard → твой проект → Settings → API
   - Скопируй **Project URL**

   **Где взять Service Role Key:**
   - Supabase Dashboard → Settings → API → Project API keys
   - Скопируй ключ **service_role** (⚠️ не показывай никому!)

---

## Шаг 3: Запусти SQL миграции в Supabase

Зайди в [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor → выполни по порядку:

### Миграция 1: Таблица RPS комнат
Скопируй содержимое `supabase/migrations/002_rps_rooms.sql` и выполни

### Миграция 2: Discord XP поля
Скопируй содержимое `supabase/migrations/003_discord_xp.sql` и выполни

### Миграция 3: Функция add_site_xp
Скопируй содержимое `supabase/migrations/004_add_site_xp_function.sql` и выполни

---

## Шаг 4: Убедись что бот добавлен на сервер

1. Discord Developer Portal → твоё приложение → **OAuth2 → URL Generator**
2. Выбери scope: **bot**, **applications.commands**
3. Выбери Bot Permissions:
   - Send Messages
   - Embed Links
   - Read Message History
   - Connect (Voice)
   - Speak (Voice)
4. Скопируй ссылку из **Generated URL** и открой в браузере
5. Выбери свой сервер и авторизуй

---

## Шаг 5: Запусти бота

### На своём ПК (Windows):

```bash
cd c:\Users\Arman\Desktop\lola\bot
npm install
npm start
```

Бот запустится. **Не закрывай терминал!** Пока он работает — бот онлайн.

### Чтобы бот работал 24/7:

Нужен сервер. Бесплатные варианты:

#### Вариант A: Railway (рекомендую)
1. Зайди на [https://railway.app](https://railway.app)
2. Войди через GitHub
3. New Project → Deploy from GitHub repo
4. Подключи свой репозиторий
5. Добавь переменные окружения (все из `.env`)
6. Railway сам запустит!

#### Вариант B: Render
1. [https://render.com](https://render.com)
2. New → Web Service
3. Подключи репозиторий
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Добавь переменные окружения

#### Вариант C: VPS (Ubuntu)
```bash
# На сервере:
git clone <твой_репозиторий>
cd lola/bot
npm install

# Запуск через PM2 (чтоб работал в фоне):
npm install -g pm2
pm2 start src/index.js --name lola-bot
pm2 save
pm2 startup
```

---

## Шаг 6: Проверь что работает

### В терминале должно быть:
```
✅ Бот Lola#1234 запущен!
   Сервер: 1463228311118549124
   XP за voice: +1 каждые 60с
   XP за сообщение: 1-3 (кд 3мин)
   Синхронизация: каждые 300с
```

### В Discord:
1. Зайди в голосовой канал на 15+ минут
2. Выйди
3. Напиши `/rank`
4. Должен показать твой ранг с XP

---

## 🔧 Настройки (по желанию)

В файле `bot/src/index.js` есть `CONFIG`:

```javascript
const CONFIG = {
  voiceXpInterval: 60,      // секунд для +1 XP в voice
  voiceXpAmount: 1,         // сколько XP давать
  messageXpRange: [1, 3],   // XP за сообщение (мин, макс)
  messageXpCooldown: 180,   // 3 минуты между XP за сообщения
  syncInterval: 300000,     // 5 минут — отправка на сайт
};
```

Можешь менять как хочешь.

---

## 🐛 Решение проблем

### Бот не отвечает на /rank
- Проверь что бот онлайн (терминал не закрыт)
- Проверь что бот добавлен на сервер
- Проверь логи в терминале

### XP не сохраняется на сайте
- Проверь SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY
- Проверь что миграция 004 выполнена (функция add_site_xp)

### Бот не подключается
- Перегенерируй токен и обнови .env
- Проверь что бот добавлен на сервер

---

## 📁 Структура файлов бота

```
bot/
├── .env                    # Секреты (НЕ КОММИТЬ!)
├── .env.example            # Шаблон
├── .gitignore
├── package.json
└── src/
    └── index.js            # Главный файл бота
```
