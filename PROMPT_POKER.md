# ИИ-ассистент для добавления Покера в мини-игры

Ты добавляешь новую игру **Покер** в существующее веб-приложение LoLa (Discord-бот / игровой хаб).

## Структура проекта

Это React + TypeScript приложение с Vite, использует Supabase (PostgreSQL) для бэкенда.

### Ключевые файлы

- `src/pages/MiniGames.tsx` — страница списка мини-игр
- `src/App.tsx` — роутинг
- `supabase/migrations/` — миграции БД
- `src/lib/supabase.ts` — Supabase клиент

### Существующие игры (примеры для подражания)

**1. Камень-Ножницы-Бумага (RPS)** — `src/pages/GameRooms.tsx`
- Комнаты создаются в Supabase таблице `rps_rooms`
- 1 на 1 PvP, ставки в грибы (валюта сайта)
- Игроки делают выбор → раунд → определение победителя → начисление грибов

**2. Шашки Онлайн** — `src/pages/CheckersOnline.tsx`
- Используют комнаты с ID в URL (`/checkers-online/:roomId`)

### Как работает система комнат

1. **Создание комнаты**: INSERT в таблицу БД (например `poker_rooms`)
2. **Подключение игрока**: UPDATE таблицы, добавление guest_id
3. **Realtime**: Supabase Realtime подписка на изменения таблицы
4. **Ставки**: Проверка `user.mushrooms`, начисление после игры через UPDATE в таблице `users`
5. **Запись игры**: INSERT в таблицу `games` (game_type, bet, result, mushrooms_change)

### Интерфейс (UI)

Проект использует:
- Tailwind CSS
- Framer Motion для анимаций
- Lucide React для иконок
- Класс `glass-card` — полупрозрачная карточка с blur
- Цветовая схема: темная, акцент `text-mushroom-neon` (#A3E635)

---

## Твоя задача

Допиши пустые файлы для полноценной игры в **Покер Texas Hold'em**.

### Файлы для реализации

1. **`src/pages/Poker.tsx`** — основной компонент игры
   - Lobby: создать/присоединиться к комнате
   - Игровой стол: карты, ставки,showdown
   - Используй существующий стиль из GameRooms.tsx

2. **`supabase/migrations/007_poker_rooms.sql`** — миграция для таблицы комнат
   - Аналогично `002_rps_rooms.sql`
   - Поля: id, name, host_id, host_name, guests (ARRAY), board_cards, player_hands, current_bet, pot, status, created_at

3. **Обнови `src/pages/MiniGames.tsx`**
   - Добавь покер в массив `games`
   - id: 'poker', name: 'Покер', emoji: '🃏', path: '/poker'

4. **Обнови `src/App.tsx`**
   - Добавь роут `/poker` → Poker
   - Добавь lazy import

### Требования к Покеру

- Texas Hold'em (2 карты на руки + 5 на стол)
- 2-6 игроков
- Ставки (от 10 до 1000 🍄)
- Визуальное отображение карт (можно текстовые ♠️♥️♦️♣️)
- Определение победителя по стандартным комбинациям
- Запись в `games` таблице

### Важно

- Используй тот же стиль кода что в GameRooms.tsx
- Не добавляй комментарии
- Сохраняй существующие игры рабочими
- Используй `supabase` из `src/lib/supabase`
- Используй `useAuth` из `src/hooks/useAuth` для получения юзера
- Типизация через TypeScript interface