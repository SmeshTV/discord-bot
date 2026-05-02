-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  mushrooms INTEGER DEFAULT 100,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица игр
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  bet INTEGER NOT NULL,
  result TEXT NOT NULL,
  mushrooms_change INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица достижений
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_name TEXT NOT NULL,
  unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица магазина (покупки)
CREATE TABLE IF NOT EXISTS shop_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица предметов магазина
CREATE TABLE IF NOT EXISTS shop_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  emoji TEXT,
  rarity TEXT NOT NULL,
  available BOOLEAN DEFAULT true
);

-- Включаем Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;

-- Политики для users
CREATE POLICY "Публичные данные пользователей" ON users
  FOR SELECT USING (true);

CREATE POLICY "Пользователь обновляет свои данные" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Пользователь создаёт свой профиль" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Политики для games
CREATE POLICY "Все видят игры" ON games
  FOR SELECT USING (true);

CREATE POLICY "Пользователь создаёт свои игры" ON games
  FOR INSERT WITH CHECK (true);

-- Политики для achievements
CREATE POLICY "Все видят достижения" ON achievements
  FOR SELECT USING (true);

-- Политики для shop_purchases
CREATE POLICY "Все видят покупки" ON shop_purchases
  FOR SELECT USING (true);

CREATE POLICY "Пользователь создаёт свои покупки" ON shop_purchases
  FOR INSERT WITH CHECK (true);

-- Политики для shop_items
CREATE POLICY "Все видят предметы" ON shop_items
  FOR SELECT USING (true);

-- Функция для атомарной записи игры и обновления статистики пользователя
CREATE OR REPLACE FUNCTION record_game_and_update_stats(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet INTEGER,
  p_result TEXT,
  p_mushrooms_change INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Вставляем запись об игре
  INSERT INTO games (user_id, game_type, bet, result, mushrooms_change)
  VALUES (p_user_id, p_game_type, p_bet, p_result, p_mushrooms_change);

  -- Обновляем статистику пользователя атомарно
  UPDATE users
  SET
    games_played = games_played + 1,
    wins = wins + CASE WHEN p_result = 'win' THEN 1 ELSE 0 END,
    mushrooms = mushrooms + p_mushrooms_change,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Индексы для ускорения запросов
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_purchases_user_id ON shop_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_users_mushrooms ON users(mushrooms DESC);
