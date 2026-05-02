-- Исправление таблиц игровых комнат
-- Добавляем уникальные индексы для предотвращения дубликатов
-- и настраиваем Realtime для правильной синхронизации

-- 1. RPS Rooms (Камень-Ножницы-Бумага)
-- Исправляем тип ID (должен быть TEXT, так как мы вставляем строки вида "rps-...")
ALTER TABLE rps_rooms ALTER COLUMN id TYPE TEXT USING id::text;
-- Добавляем колонку last_activity если её нет
ALTER TABLE rps_rooms ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();
-- Уникальный индекс: у каждого хоста может быть только одна waiting комната
CREATE UNIQUE INDEX IF NOT EXISTS idx_rps_unique_waiting ON rps_rooms (host_id) WHERE status = 'waiting';
-- Настройка Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rps_rooms;
ALTER TABLE rps_rooms REPLICA IDENTITY FULL;

-- 2. Checkers Rooms (Шашки)
-- Уникальный индекс: у каждого хоста может быть только одна waiting комната
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkers_unique_waiting ON checkers_rooms (player_white) WHERE status = 'waiting';
-- Настройка Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE checkers_rooms;
ALTER TABLE checkers_rooms REPLICA IDENTITY FULL;

-- 3. Durak Rooms (Дурак)
-- Уникальный индекс: у каждого хоста может быть только одна waiting комната
CREATE UNIQUE INDEX IF NOT EXISTS idx_durak_unique_waiting ON durak_rooms (host_id) WHERE status = 'waiting';
-- Настройка Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE durak_rooms;
ALTER TABLE durak_rooms REPLICA IDENTITY FULL;

-- 4. Poker Rooms (Покер)
-- Уникальный индекс: у каждого хоста может быть только одна waiting комната
CREATE UNIQUE INDEX IF NOT EXISTS idx_poker_unique_waiting ON poker_rooms (host_id) WHERE status = 'waiting';
-- Добавляем колонку last_activity если её нет
ALTER TABLE poker_rooms ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();
-- Настройка Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE poker_rooms;
ALTER TABLE poker_rooms REPLICA IDENTITY FULL;

-- 5. Функция для автоматического обновления last_activity
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггеры к игровым таблицам
DROP TRIGGER IF EXISTS update_rps_last_activity ON rps_rooms;
CREATE TRIGGER update_rps_last_activity
  BEFORE UPDATE ON rps_rooms
  FOR EACH ROW EXECUTE FUNCTION update_last_activity();

DROP TRIGGER IF EXISTS update_checkers_last_activity ON checkers_rooms;
CREATE TRIGGER update_checkers_last_activity
  BEFORE UPDATE ON checkers_rooms
  FOR EACH ROW EXECUTE FUNCTION update_last_activity();

DROP TRIGGER IF EXISTS update_durak_last_activity ON durak_rooms;
CREATE TRIGGER update_durak_last_activity
  BEFORE UPDATE ON durak_rooms
  FOR EACH ROW EXECUTE FUNCTION update_last_activity();

DROP TRIGGER IF EXISTS update_poker_last_activity ON poker_rooms;
CREATE TRIGGER update_poker_last_activity
  BEFORE UPDATE ON poker_rooms
  FOR EACH ROW EXECUTE FUNCTION update_last_activity();
