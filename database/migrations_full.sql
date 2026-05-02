-- =============================================
-- LOLA — ПОЛНЫЙ SQL ДЛЯ SUPABASE
-- Вставь весь этот код в Supabase SQL Editor
-- =============================================

-- 1. ТАБЛИЦА ОТЗЫВОВ (Reviews)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 500),
  likes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все читают отзывы" ON reviews FOR SELECT USING (true);
CREATE POLICY "Все создают отзывы" ON reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Все обновляют отзывы" ON reviews FOR UPDATE USING (true);
CREATE POLICY "Все удаляют отзывы" ON reviews FOR DELETE USING (true);


-- 2. ТАБЛИЦА МЕРОПРИЯТИЙ (Events)
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
  registered_players TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все читают мероприятия" ON events FOR SELECT USING (true);
CREATE POLICY "Все создают мероприятия" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Все обновляют мероприятия" ON events FOR UPDATE USING (true);
CREATE POLICY "Все удаляют мероприятия" ON events FOR DELETE USING (true);


-- 3. ТАБЛИЦА ЗАЯВОК НА РОЛИ (Role Applications)
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
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_apps_created ON role_applications(created_at DESC);
ALTER TABLE role_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все читают заявки" ON role_applications FOR SELECT USING (true);
CREATE POLICY "Все создают заявки" ON role_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Все обновляют заявки" ON role_applications FOR UPDATE USING (true);


-- 4. ТАБЛИЦА ДОСТИЖЕНИЙ (Achievements)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все читают достижения" ON achievements FOR SELECT USING (true);
CREATE POLICY "Все создают достижения" ON achievements FOR INSERT WITH CHECK (true);


-- 5. ТАБЛИЦА ПРЕДУПРЕЖДЕНИЙ (Warnings)
CREATE TABLE IF NOT EXISTS warnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  discord_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  issued_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(user_id);
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все читают свои варны" ON warnings
  FOR SELECT USING (true);

CREATE POLICY "Админы создают варны" ON warnings
  FOR INSERT WITH CHECK (true);


-- 6. ДОБАВИТЬ ГРИБЫ — функция
DROP FUNCTION IF EXISTS add_mushrooms(text, integer);
CREATE OR REPLACE FUNCTION add_mushrooms(p_user_id TEXT, p_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET mushrooms = mushrooms + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. ЗАПИСАТЬ ИГРУ — функция (атомарная)
DROP FUNCTION IF EXISTS record_game_and_update_stats(text, text, integer, text, integer);
CREATE OR REPLACE FUNCTION record_game_and_update_stats(
  p_user_id TEXT,
  p_game_type TEXT,
  p_bet INTEGER,
  p_result TEXT,
  p_mushrooms_change INTEGER
)
RETURNS void AS $$
DECLARE
  v_current_mushrooms INTEGER;
BEGIN
  -- Получаем текущий баланс
  SELECT mushrooms INTO v_current_mushrooms FROM users WHERE id = p_user_id;

  -- Записываем игру
  INSERT INTO games (user_id, game_type, bet, result, mushrooms_change)
  VALUES (p_user_id, p_game_type, p_bet, p_result, p_mushrooms_change);

  -- Обновляем статистику
  UPDATE users SET
    games_played = games_played + 1,
    mushrooms = GREATEST(mushrooms + p_mushrooms_change, 0),
    wins = CASE WHEN p_result = 'win' THEN wins + 1 ELSE wins END,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 8. KOMHATA ШАШЕК — таблица
CREATE TABLE IF NOT EXISTS checkers_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Шашки',
  player_white TEXT NOT NULL,
  player_white_name TEXT NOT NULL,
  player_black TEXT,
  player_black_name TEXT,
  board_state JSONB NOT NULL,
  current_turn TEXT NOT NULL DEFAULT 'w',
  status TEXT NOT NULL DEFAULT 'waiting',
  winner TEXT,
  must_jump JSONB,
  bet INTEGER DEFAULT 0,
  has_bet BOOLEAN DEFAULT false,
  rules JSONB NOT NULL,
  timer_seconds INTEGER DEFAULT 600,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  move_history JSONB DEFAULT '[]',
  reset_requested_by TEXT,
  fuk_violation JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checkers_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Все читают комнаты" ON checkers_rooms FOR SELECT USING (true);
CREATE POLICY "Все создают комнаты" ON checkers_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Все обновляют комнаты" ON checkers_rooms FOR UPDATE USING (true);


-- 9. KOMHATA КНБ — таблица
CREATE TABLE IF NOT EXISTS rps_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'КНБ',
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  guest_id TEXT,
  guest_name TEXT,
  bet INTEGER NOT NULL DEFAULT 10,
  host_choice TEXT,
  guest_choice TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  winner TEXT,
  mushrooms_change INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rps_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Все читают комнаты КНБ" ON rps_rooms FOR SELECT USING (true);
CREATE POLICY "Все создают комнаты КНБ" ON rps_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Все обновляют комнаты КНБ" ON rps_rooms FOR UPDATE USING (true);


-- 9. МЕРОПРИЯТИЯ — таблица
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  game TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  max_players INTEGER DEFAULT 8,
  registered_players TEXT[] DEFAULT '{}',
  host_id TEXT,
  host_name TEXT,
  status TEXT DEFAULT 'upcoming',
  discord_message_id TEXT,
  discord_scheduled_event_id TEXT,
  discord_channel_id TEXT,
  embed_settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to events" ON events FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- 10. ТИКЕТЫ — таблица
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  assigned_to TEXT,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tickets" ON tickets FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);

-- =============================================
-- ГОТОВО! Все таблицы созданы.
-- Проверь в Table Editor что все таблицы появились.
-- =============================================
