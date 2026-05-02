-- Камень-Ножницы-Бумага комнаты
CREATE TABLE IF NOT EXISTS rps_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES users(id),
  host_name TEXT NOT NULL,
  guest_id UUID REFERENCES users(id),
  guest_name TEXT,
  host_choice TEXT CHECK (host_choice IN ('rock', 'paper', 'scissors')),
  guest_choice TEXT CHECK (guest_choice IN ('rock', 'paper', 'scissors')),
  host_revealed BOOLEAN DEFAULT false,
  guest_revealed BOOLEAN DEFAULT false,
  winner TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'choosing', 'revealed', 'finished')),
  bet INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Realtime подписка
ALTER PUBLICATION supabase_realtime ADD TABLE rps_rooms;

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_rps_rooms_status ON rps_rooms(status);
CREATE INDEX IF NOT EXISTS idx_rps_rooms_host ON rps_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rps_rooms_guest ON rps_rooms(guest_id);
CREATE INDEX IF NOT EXISTS idx_rps_rooms_created ON rps_rooms(created_at DESC);

-- RLS политики
ALTER TABLE rps_rooms ENABLE ROW LEVEL SECURITY;

-- Все могут читать
CREATE POLICY "Все могут читать комнаты" ON rps_rooms FOR SELECT USING (true);

-- Авторизованные могут создавать
CREATE POLICY "Авторизованные могут создавать комнаты" ON rps_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Хост или гость могут обновлять
CREATE POLICY "Участники могут обновлять свои комнаты" ON rps_rooms FOR UPDATE USING (
  auth.uid() = host_id 
  OR auth.uid() = guest_id 
  OR (status = 'waiting' AND guest_id IS NULL)  -- Позволяем гостям join-иться
);

-- Хост может удалять
CREATE POLICY "Хост может удалять комнаты" ON rps_rooms FOR DELETE USING (auth.uid() = host_id);
