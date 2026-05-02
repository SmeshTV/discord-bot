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