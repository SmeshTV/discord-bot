-- Миграция: Временные роли (30 дней) + поля для rainbow ника
-- Дата: 2026-04-13

-- ===== 1. Добавить expires_at в shop_purchases =====

ALTER TABLE shop_purchases ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Заполнить expires_at для существующих записей (30 дней с покупки)
UPDATE shop_purchases 
SET expires_at = purchased_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- ===== 2. Поля для rainbow ника в users =====

ALTER TABLE users ADD COLUMN IF NOT EXISTS rainbow_color1 VARCHAR(7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rainbow_color2 VARCHAR(7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rainbow_role_id TEXT;
