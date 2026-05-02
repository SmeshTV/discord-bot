-- Исправить таблицу checkers_rooms - добавить недостающие колонки
ALTER TABLE checkers_rooms ADD COLUMN IF NOT EXISTS bet INTEGER DEFAULT 0;
ALTER TABLE checkers_rooms ADD COLUMN IF NOT EXISTS has_bet BOOLEAN DEFAULT false;
ALTER TABLE checkers_rooms ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '{}';
ALTER TABLE checkers_rooms ADD COLUMN IF NOT EXISTS timer_seconds INTEGER DEFAULT 600;
ALTER TABLE checkers_rooms ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE checkers_rooms ADD COLUMN IF NOT EXISTS move_history JSONB DEFAULT '[]';
ALTER TABLE checkers_rooms ADD COLUMN IF NOT EXISTS reset_requested_by TEXT;
ALTER TABLE checkers_rooms ADD COLUMN IF NOT EXISTS fuk_violation JSONB;