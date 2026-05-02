-- Миграция: Система предупреждений (варнов)
-- Дата: 2026-04-15

-- ===== 1. Обновляем warnings =====

ALTER TABLE warnings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS mute_duration_hours INT;
ALTER TABLE warnings ADD COLUMN IF NOT EXISTS discord_message_id TEXT;

-- Статусы: pending, accepted, rejected
-- 3 принятых варна = мут 3 дня (72 часа)

-- ===== 2. Индексы =====
CREATE INDEX IF NOT EXISTS idx_warnings_status ON warnings(status);
CREATE INDEX IF NOT EXISTS idx_warnings_user_id ON warnings(user_id);
