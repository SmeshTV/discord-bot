-- Create durak_rooms table
CREATE TABLE IF NOT EXISTS durak_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Дурак',
  host_id TEXT,
  host_name TEXT,
  players JSONB NOT NULL DEFAULT '[]',
  deck JSONB NOT NULL DEFAULT '[]',
  trump_suit TEXT NOT NULL DEFAULT 'hearts',
  trump_card JSONB,
  game_table JSONB NOT NULL DEFAULT '[]',
  table_state JSONB NOT NULL DEFAULT '[]',
  attacker_idx INTEGER NOT NULL DEFAULT 0,
  defender_idx INTEGER NOT NULL DEFAULT 1,
  next_player_idx INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'waiting',
  winner TEXT,
  loser TEXT,
  bet INTEGER NOT NULL DEFAULT 0,
  has_bet BOOLEAN NOT NULL DEFAULT FALSE,
  mode TEXT NOT NULL DEFAULT 'podkidnoy',
  max_players INTEGER NOT NULL DEFAULT 2,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  timer_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  timer_seconds INTEGER NOT NULL DEFAULT 30,
  current_turn_time INTEGER NOT NULL DEFAULT 30,
  allow_bluff BOOLEAN NOT NULL DEFAULT TRUE,
  auto_take BOOLEAN NOT NULL DEFAULT FALSE,
  rules JSONB NOT NULL DEFAULT '{"mode":"podkidnoy","bluffEnabled":true,"autoTake":false,"showTrumpAlways":true,"timerEnabled":true,"timerSeconds":30,"maxPlayers":2,"startCards":6}',
  created_at TEXT NOT NULL DEFAULT NOW(),
  last_activity TEXT NOT NULL DEFAULT NOW(),
  move_history JSONB NOT NULL DEFAULT '[]',
  reset_requested_by TEXT,
  waiting_for_bito BOOLEAN NOT NULL DEFAULT FALSE
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE durak_rooms;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_durak_rooms_status ON durak_rooms(status);