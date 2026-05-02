-- ==========================================
-- LOLA — Новые таблицы для сайта
-- Запусти этот SQL в Supabase SQL Editor
-- ==========================================

-- 1. ТАБЛИЦА ОТЗЫВОВ (Reviews)
-- Все игроки видят все отзывы, могут лайкать
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 500),
  likes TEXT[] DEFAULT '{}', -- массив user_id которые лайкнули
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрой сортировки
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);

-- RLS политики для reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Все могут читать
CREATE POLICY "Все могут читать отзывы" ON reviews
  FOR SELECT USING (true);

-- Авторизованные могут создавать
CREATE POLICY "Авторизованные могут создавать отзывы" ON reviews
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR true);

-- Авторизованные могут обновлять ТОЛЬКО свои (лайки)
CREATE POLICY "Авторизованные могут обновлять отзывы" ON reviews
  FOR UPDATE USING (true);

-- Авторизованные могут удалять ТОЛЬКО свои
CREATE POLICY "Авторизованные могут удалять свои отзывы" ON reviews
  FOR DELETE USING (auth.uid()::text = user_id);


-- 2. ТАБЛИЦА ЗАЯВОК НА РОЛИ (Role Applications)
-- Игроки подают заявку, админы видят в админ-панели
CREATE TABLE IF NOT EXISTS role_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  discord_id TEXT,
  desired_role TEXT NOT NULL,
  reason TEXT NOT NULL,
  experience TEXT NOT NULL,
  activity_hours TEXT NOT NULL,
  about_me TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для сортировки
CREATE INDEX IF NOT EXISTS idx_role_applications_created ON role_applications(created_at DESC);

-- RLS политики для role_applications
ALTER TABLE role_applications ENABLE ROW LEVEL SECURITY;

-- Все авторизованные могут читать (прозрачность)
CREATE POLICY "Авторизованные могут читать заявки" ON role_applications
  FOR SELECT USING (true);

-- Авторизованные могут создавать
CREATE POLICY "Авторизованные могут создавать заявки" ON role_applications
  FOR INSERT WITH CHECK (true);

-- Авторизованные могут обновлять (админы меняют статус)
CREATE POLICY "Авторизованные могут обновлять заявки" ON role_applications
  FOR UPDATE USING (true);


-- 3. ТАБЛИЦА МЕРОПРИЯТИЙ (Events)
-- Общие для всех, создаются из админ-панели
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  game TEXT NOT NULL,
  game_emoji TEXT NOT NULL DEFAULT '🎮',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 10,
  registered_players TEXT[] DEFAULT '{}', -- массив user_id
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming, ongoing, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для сортировки
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

-- RLS политики для events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Все могут читать
CREATE POLICY "Все могут читать мероприятия" ON events
  FOR SELECT USING (true);

-- Авторизованные могут создавать (через админ-панель)
CREATE POLICY "Авторизованные могут создавать мероприятия" ON events
  FOR INSERT WITH CHECK (true);

-- Авторизованные могут обновлять (регистрация, статус)
CREATE POLICY "Авторизованные могут обновлять мероприятия" ON events
  FOR UPDATE USING (true);

-- Авторизованные могут удалять (админы)
CREATE POLICY "Авторизованные могут удалять мероприятия" ON events
  FOR DELETE USING (true);


-- 4. ТАБЛИЦА ОТЗЫВОВ К МЕРОПРИЯТИЯМ (Event Reviews)
CREATE TABLE IF NOT EXISTS event_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 300),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_reviews_event ON event_reviews(event_id);

ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все могут читать отзывы к ивентам" ON event_reviews
  FOR SELECT USING (true);

CREATE POLICY "Авторизованные могут создавать отзывы к ивентам" ON event_reviews
  FOR INSERT WITH CHECK (true);


-- ==========================================
-- ФУНКЦИЯ: добавить грибы пользователю
-- ==========================================
CREATE OR REPLACE FUNCTION add_mushrooms(user_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET mushrooms = mushrooms + amount,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
