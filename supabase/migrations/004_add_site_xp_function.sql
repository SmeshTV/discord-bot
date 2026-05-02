-- Функция для начисления XP от бота (voice + сообщения)
-- Обновляет discord_xp и discord_level
-- Формула: каждый уровень = level × 30 XP
-- 1 XP ≈ 1 минута в голосовом канале
--
-- Уровни:
--   Lvl 2  = 30 XP   (30 мин)
--   Lvl 5  = 450 XP  (7.5 часов)
--   Lvl 10 = 1650 XP (27.5 часов)
--   Lvl 20 = 6300 XP (105 часов)
--   Lvl 60 = 54900 XP (915 часов ≈ 38 суток)
--
CREATE OR REPLACE FUNCTION add_site_xp(
  p_user_id TEXT,
  p_xp_amount INTEGER,
  p_messages INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_discord_xp INTEGER;
  v_current_discord_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  SELECT COALESCE(discord_xp, 0), COALESCE(discord_level, 1)
    INTO v_current_discord_xp, v_current_discord_level
  FROM users
  WHERE discord_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_new_xp := v_current_discord_xp + p_xp_amount;
  v_new_level := v_current_discord_level;

  -- Каждый уровень = level × 30 XP (прогрессивная система)
  WHILE v_new_xp >= v_new_level * 30 LOOP
    v_new_xp := v_new_xp - (v_new_level * 30);
    v_new_level := v_new_level + 1;
  END LOOP;

  UPDATE users
  SET
    discord_xp = v_new_xp,
    discord_level = v_new_level,
    last_sync = NOW(),
    updated_at = NOW()
  WHERE discord_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_site_xp(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION add_site_xp(TEXT, INTEGER, INTEGER) TO service_role;
