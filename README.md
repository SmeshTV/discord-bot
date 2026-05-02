# 🍄 LOLA — Discord Community Platform

Полнофункциональная веб-платформа для Discord-сообщества "LOLA" с системой прогрессии, играми, магазином и панелью мониторинга.

## 🚀 Возможности

### Для пользователей
- **Авторизация через Discord** — OAuth 2.0 интеграция через Supabase
- **Дашборд** — отслеживание XP, уровня, грибов (🍄), достижений и истории игр
- **Система прогрессии** — двойной уровень: Discord XP (за активность в Discord) + Сайт XP (за игры)
- **Казино** — монетка, кости, рулетка с системой House Edge и streak protection
- **Магазин** — покупка VIP-статуса, кастомных цветов, приватных каналов, значков, бустов XP
- **Таблица лидеров** — рейтинг лучших игроков по грибам и XP
- **Игровые комнаты** — шашки онлайн (PvP) и оффлайн
- **Система тикетов** — обращение к администрации
- **Система варнов** — просмотр предупреждений

### Для администрации
- **Панель администратора** — управление пользователями, играми, магазином
- **Ролевая система** — 20+ Discord ролей с различными правами на сайте
- **Система уведомлений** — toast-уведомления о достижениях и событиях

### Discord бот
- **Начисление XP** — за голосовые каналы (+1 XP/мин) и сообщения (+1-3 XP)
- **Начисление грибов** — +1 🍄 каждые 2 минуты в голосовом канале
- **Автосинхронизация** — flush буфера в базу данных каждые 5 минут
- **Команды** — `/rank`, `/leaderboard`, `/link`, `/sync`

## 🛠️ Технологический стек

### Фронтенд
- **React 18** + **TypeScript**
- **Vite 5** — сборщик
- **React Router DOM 7** — маршрутизация
- **Tailwind CSS 3** — стилизация с кастомной темой
- **Framer Motion** — анимации
- **Lucide React** — иконки
- **Supabase JS SDK** — клиент базы данных

### Бэкенд
- **Supabase** — PostgreSQL база данных, Auth, Edge Functions
- **Discord OAuth 2.0** — авторизация

### Бот
- **Node.js** + **discord.js v14**
- **Supabase JS SDK** — синхронизация с базой данных
- **dotenv** — управление секретами

## 📁 Структура проекта

```
lola/
├── src/
│   ├── components/       # React компоненты UI
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── HeroSection.tsx
│   │   ├── StatsSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── RulesSection.tsx
│   │   ├── ParticleBackground.tsx
│   │   ├── ActivityChart.tsx
│   │   ├── Skeleton.tsx
│   │   └── NotificationToast.tsx
│   ├── hooks/           # Custom React хуки
│   │   ├── useAuth.tsx   # Контекст авторизации
│   │   ├── useTheme.tsx  # Тёмная/светлая тема
│   │   └── useProtection.ts # Защита от копирования
│   ├── lib/             # Утилиты и API
│   │   ├── supabase.ts   # Клиент Supabase
│   │   ├── database.ts   # CRUD операции
│   │   ├── casino.ts     # Логика казино
│   │   ├── roles.ts      # Карта ролей Discord
│   │   ├── cache.ts      # LocalStorage кэш
│   │   ├── logger.ts     # Логирование
│   │   └── notifications.ts
│   ├── pages/           # Страницы приложения
│   │   ├── Home.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Games.tsx
│   │   ├── Shop.tsx
│   │   ├── Leaderboard.tsx
│   │   ├── AdminPanel.tsx
│   │   ├── PlayerProfile.tsx
│   │   ├── Monitoring.tsx
│   │   ├── Tickets.tsx
│   │   ├── Warnings.tsx
│   │   ├── GameRooms.tsx
│   │   ├── Checkers.tsx
│   │   ├── CheckersOnline.tsx
│   │   └── NotFound.tsx
│   ├── App.tsx          # Корневой компонент
│   ├── main.tsx         # Точка входа
│   └── index.css        # Глобальные стили
├── bot/
│   ├── src/index.js     # Код Discord бота
│   ├── package.json
│   └── .env
├── database/
│   └── schema.sql       # SQL схема базы данных
├── public/              # Статические файлы
│   ├── manifest.json    # PWA манифест
│   └── sw.js            # Service Worker
└── package.json
```

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 18+
- Аккаунт Supabase
- Discord Application (для OAuth и бота)

### Установка фронтенда

```bash
# Клонировать репозиторий
git clone <repository-url>
cd lola

# Установить зависимости
npm install

# Скопировать .env.example в .env и заполнить
cp .env.example .env

# Запустить в режиме разработки
npm run dev

# Собрать для продакшена
npm run build
```

### Настройка Discord OAuth в Supabase

1. Перейдите в **Supabase Dashboard** → **Authentication** → **Providers**
2. Включите **Discord** провайдер
3. Введите **Client ID** и **Client Secret** из Discord Developer Portal
4. Установите **Redirect URL**: `https://<your-project>.supabase.co/auth/v1/callback`

### Запуск бота

```bash
cd bot

# Установить зависимости
npm install

# Скопировать .env.example в .env и заполнить
cp .env.example .env

# Запустить бота
node src/index.js
```

### Переменные окружения (фронтенд)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Переменные окружения (бот)

```env
DISCORD_BOT_TOKEN=your-bot-token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 📊 База данных

Схема базы данных находится в `database/schema.sql`. Она включает:

- **users** — пользователи (уровень, XP, грибы, статистика)
- **games** — история игр (тип, ставка, результат, изменение грибов)
- **achievements** — достижения пользователей
- **shop_items** — предметы магазина
- **shop_purchases** — покупки пользователей

### Хранимые функции

- `record_game_and_update_stats()` — атомарная запись игры + обновление статистики

## 🎮 Система прогрессии

### Discord XP (за активность в Discord)
| Действие | Награда |
|---|---|
| Голосовой канал | +1 XP / 60 сек |
| Голосовой канал | +1 🍄 / 120 сек |
| Сообщение в чате | +1-3 XP (cooldown 5 мин) |

### Уровни Discord XP
Формула: **Lvl × 30 XP** для следующего уровня

| Уровень | Всего XP | Часов в voice |
|---|---|---|
| 2 | 30 | 0.5ч |
| 5 | 450 | 7.5ч |
| 10 | 1650 | 27.5ч |
| 20 | 6300 | 105ч |
| 60 | ~54,000 | ~915ч |

### Сайт XP и Грибы
- **Начальный баланс:** 100 🍄
- **Заработок:** через голосовой канал, выигрыши в казино/PvP
- **Трата:** казино, магазин, PvP ставки

## 🏪 Магазин

Предметы магазина:
1. **VIP-статус** — уникальная роль и бонусы
2. **Кастомный цвет ника** — персонализация профиля
3. **Приватный канал** — личный голосовой канал
4. **Значки** — декоративные элементы профиля
5. **Буст XP** — множитель опыта на время

## 🎨 Тема оформления

Кастомная тема "Neon Mushroom":
- **Основной цвет:** `#00FF87` (неоновый зелёный)
- **Свечение:** `#39FF14`
- **Акцент:** `#B026FF` (фиолетовый), `#FF10F0` (розовый)
- **Фон:** тёмный градиент `#0A3D2E → #1a1a2e → #16213e`

Поддержка светлой темы с гармоничными цветами.

## 📱 PWA

Приложение поддерживает Progressive Web App:
- **Manifest:** `public/manifest.json`
- **Service Worker:** `public/sw.js`
- **Иконки:** `public/icon-192.svg`, `public/icon-512.svg`

## 🔒 Безопасность

- **Row Level Security (RLS)** на всех таблицах
- **Supabase anon key** только для чтения/записи с ограничениями
- **Защита от копирования** — отключение контекстного меню, выделения
- **Логирование** — только в режиме разработки

## 📜 Скрипты

| Команда | Описание |
|---|---|
| `npm run dev` | Запуск сервера разработки |
| `npm run build` | Сборка для продакшена |
| `npm run preview` | Предпросмотр продакшен-сборки |
| `npm run lint` | Проверка кода ESLint |
| `npm run typecheck` | Проверка типов TypeScript |

## 📄 Лицензия

MIT

## 👥 Команда

- **Разработчик** — LOLA Team
- **Discord сервер:** https://discord.gg/lolaamongus

---

Сделано с 🍄 для сообщества LOLA
