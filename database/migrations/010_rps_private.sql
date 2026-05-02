-- Добавить колонку is_private для комнат КНБ
ALTER TABLE rps_rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;