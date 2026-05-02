-- Создать таблицу checkers_rooms, если её нет
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
  bet INTEGER DEFAULT 0,
  has_bet BOOLEAN DEFAULT false,
  rules JSONB DEFAULT '{"mode":"russian","flyingKing":true,"captureBackwards":true,"forcedCaptures":true,"maxCaptureChain":true,"fastKing":true,"capturePenalty":false}'::JSONB,
  timer_seconds INTEGER DEFAULT 600,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  move_history JSONB DEFAULT '[]'::JSONB,
  reset_requested_by TEXT,
  fuk_violation JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE checkers_rooms ENABLE ROW LEVEL SECURITY;

-- Политики
DROP POLICY IF EXISTS "Все читают комнаты" ON checkers_rooms;
DROP POLICY IF EXISTS "Все создают комнаты" ON checkers_rooms;
DROP POLICY IF EXISTS "Все обновляют комнаты" ON checkers_rooms;

CREATE POLICY "Все читают комнаты" ON checkers_rooms FOR SELECT USING (true);
CREATE POLICY "Все создают комнаты" ON checkers_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Все обновляют комнаты" ON checkers_rooms FOR UPDATE USING (true);