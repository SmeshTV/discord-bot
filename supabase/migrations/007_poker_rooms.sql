-- Покер Texas Hold'em комнаты
CREATE TABLE IF NOT EXISTS poker_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host_id UUID NOT NULL,
  host_name TEXT NOT NULL,
  guests TEXT[] DEFAULT '{}',
  guest_names TEXT[] DEFAULT '{}',
  deck TEXT[] DEFAULT '{}',
  board_cards TEXT[] DEFAULT '{}',
  player_cards TEXT DEFAULT '{}',
  current_bet INTEGER DEFAULT 0,
  pot INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE poker_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Все могут читать" ON poker_rooms FOR SELECT USING (true);
CREATE POLICY "Могут создавать" ON poker_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Могут обновлять" ON poker_rooms FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = ANY(guests));
CREATE POLICY "Могут удалять" ON poker_rooms FOR DELETE USING (auth.uid() = host_id);