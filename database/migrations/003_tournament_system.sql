-- Миграция: Система резерва на турниры
-- Дата: 2026-04-14

-- ===== 1. Добавить категорию в shop_items =====

-- Добавляем колонку category если её нет
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS category TEXT;

-- Обновляем существующие записи с категориями и описаниями
UPDATE shop_items SET category = 'role' WHERE id IN ('vip-role', 'custom-color');
UPDATE shop_items SET category = 'tournament' WHERE id = 'tournament-reserve';
UPDATE shop_items SET category = 'boost', description = 'Прокачка в Discord в 2 раза быстрее на 12 часов' WHERE id = 'xp-boost-x2';
UPDATE shop_items SET category = 'boost', description = 'Мощный спринт — x3 XP на 12 часов' WHERE id = 'xp-boost-x3';
UPDATE shop_items SET category = 'customization' WHERE id IN ('frame-bronze', 'frame-silver', 'frame-gold', 'profile-banner');
UPDATE shop_items SET category = 'casino' WHERE id IN ('insurance', 'lucky-hour');
UPDATE shop_items SET category = 'premium' WHERE id = 'lootbox';

-- ===== 2. Добавить поля exclusivity в events =====

-- Сколько часов доступен только для резервистов (0 = сразу для всех)
ALTER TABLE events ADD COLUMN IF NOT EXISTS exclusive_access_duration INT DEFAULT 0;

-- Timestamp до которого действует эксклюзивный доступ
ALTER TABLE events ADD COLUMN IF NOT EXISTS exclusive_until TIMESTAMPTZ;

-- Описание для резервистов
ALTER TABLE events ADD COLUMN IF NOT EXISTS exclusive_description TEXT DEFAULT 'Регистрация раньше остальных';
