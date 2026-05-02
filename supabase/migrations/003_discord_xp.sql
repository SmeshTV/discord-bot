-- Добавляем поля для Discord XP (JuniperBot)
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Индекс для синхронизации
CREATE INDEX IF NOT EXISTS idx_users_last_sync ON users(last_sync);
