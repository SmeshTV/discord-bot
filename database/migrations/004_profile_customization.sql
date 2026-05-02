-- Миграция: Обновлённые цены + новые предметы
-- Дата: 2026-04-15

-- ===== 1. Новые поля =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_badge_text TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_badge_emoji TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_banner_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_effect TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_crown BOOLEAN DEFAULT false;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS category TEXT;

-- ===== 2. Обновлённые цены =====

UPDATE shop_items SET category = 'role', price = 800 WHERE id = 'vip-role';
UPDATE shop_items SET category = 'role', price = 1200 WHERE id = 'custom-color';
UPDATE shop_items SET category = 'tournament', price = 400 WHERE id = 'tournament-reserve';
UPDATE shop_items SET category = 'boost', price = 350, description = 'Прокачка в Discord в 2 раза быстрее на 12 часов' WHERE id = 'xp-boost-x2';
UPDATE shop_items SET category = 'boost', price = 600, description = 'Мощный спринт — x3 XP на 12 часов' WHERE id = 'xp-boost-x3';
UPDATE shop_items SET category = 'customization', price = 250, description = 'Бронзовая рамка. Открывает магазин кастомизации!' WHERE id = 'frame-bronze';
UPDATE shop_items SET category = 'customization', price = 500, description = 'Серебряная анимированная рамка. Открывает Tier 2!' WHERE id = 'frame-silver';
UPDATE shop_items SET category = 'customization', price = 1000, description = 'Золотая рамка. Только #1 в лидерборде!' WHERE id = 'frame-gold';
UPDATE shop_items SET category = 'casino', price = 300, description = 'Возврат 30% при проигрыше. 24 часа.' WHERE id = 'insurance';
UPDATE shop_items SET category = 'casino', price = 500, description = '+15% к шансу в казино. 60 минут.' WHERE id = 'lucky-hour';
UPDATE shop_items SET category = 'premium', price = 350, description = 'Случайный предмет из магазина!' WHERE id = 'lootbox';

-- ===== 3. Новые предметы кастомизации =====
INSERT INTO shop_items (id, name, description, price, emoji, rarity, available, category) VALUES
  ('custom-avatar', 'Кастомная аватарка', 'URL изображения для профиля', 150, '🖼️', 'rare', true, 'customization'),
  ('custom-badge', 'Кастомный бейдж', 'Эмодзи + текст под именем', 100, '🏷️', 'rare', true, 'customization'),
  ('avatar-effect-sparkles', 'Эффект: Искорки', 'Мерцание вокруг аватара', 200, '✨', 'rare', true, 'customization'),
  ('avatar-effect-fire', 'Эффект: Огонь', 'Пламя вокруг аватара', 350, '🔥', 'epic', true, 'customization'),
  ('crown-badge', 'Корона', 'Корона над аватаром', 400, '👑', 'epic', true, 'customization'),
  ('avatar-effect-void', 'Эффект: Пустота', 'Тёмная аура поглощающая свет', 500, '🌑', 'legendary', true, 'customization'),
  ('avatar-effect-rune', 'Эффект: Руны', 'Древние руны вращаются вокруг', 600, '🔮', 'legendary', true, 'customization'),
  ('profile-banner-animated', 'Живой баннер', 'Анимированный баннер', 700, '⚡', 'legendary', true, 'customization')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  emoji = EXCLUDED.emoji,
  rarity = EXCLUDED.rarity,
  available = EXCLUDED.available,
  category = EXCLUDED.category;
