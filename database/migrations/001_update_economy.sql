-- Миграция: Обновление экономики и добавление новых предметов магазина
-- Дата: 2026-04-13

-- ===== 1. Новые поля в users =====

-- XP буст
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_boost_multiplier INT DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_boost_expires_at TIMESTAMPTZ;

-- Страховка от проигрыша
ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_active BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_insurance_refund INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_refund_reset DATE;

-- Удачный час
ALTER TABLE users ADD COLUMN IF NOT EXISTS lucky_hour_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lucky_hour_last_purchase TIMESTAMPTZ;

-- Кастомизация профиля
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_frame VARCHAR(20);

-- ===== 2. Обновить предметы магазина =====

-- Удаляем старые предметы
DELETE FROM shop_items;

-- Вставляем новые предметы
INSERT INTO shop_items (id, name, description, price, emoji, rarity, available) VALUES
  ('vip-role', 'VIP Роль', 'Эксклюзивный доступ к VIP-зоне сервера. Общение со стаффом!', 500, '👑', 'legendary', true),
  ('custom-color', 'Переливающийся ник', 'Выбери 2 цвета — ник будет переливаться в Discord! (30 дней, макс. 50 чел.)', 800, '🎨', 'legendary', true),
  ('tournament-reserve', 'Резерв на турнир', 'Ранний доступ к регистрации на турниры', 250, '🏆', 'epic', true),
  ('xp-boost-x2', 'XP Буст x2 (24ч)', 'Прокачка в Discord в 2 раза быстрее на 24 часа', 200, '⚡', 'epic', true),
  ('xp-boost-x3', 'XP Буст x3 (12ч)', 'Мощный спринт — x3 XP на 12 часов', 350, '🔥', 'legendary', true),
  ('frame-bronze', 'Рамка аватара 🥉', 'Бронзовая рамка для аватара в профиле', 120, '🥉', 'rare', true),
  ('frame-silver', 'Рамка аватара 🥈', 'Серебряная анимированная рамка для аватара', 300, '🥈', 'epic', true),
  ('frame-gold', 'Рамка аватара 🥇', 'Золотая рамка с эффектом частиц', 600, '🥇', 'legendary', true),
  ('profile-banner', 'Баннер профиля', 'Кастомный фон в шапке твоего профиля', 250, '🎭', 'epic', true),
  ('insurance', 'Страховка (7 дней)', 'Возврат 25% в играх, 50% в казино при проигрыше', 250, '🛡️', 'epic', true),
  ('lucky-hour', 'Удачный час', '+10% к шансу победы в казино на 60 минут', 450, '🍀', 'legendary', true),
  ('lootbox', 'Грибной лутбокс', 'Случайный предмет — открой и узнай!', 200, '🎁', 'legendary', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  emoji = EXCLUDED.emoji,
  rarity = EXCLUDED.rarity,
  available = EXCLUDED.available;
