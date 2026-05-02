-- Миграция: Гибкие настройки шашек
-- Дата: 2026-04-15

ALTER TABLE checkers_rooms ADD COLUMN IF NOT EXISTS rules_config JSONB;
