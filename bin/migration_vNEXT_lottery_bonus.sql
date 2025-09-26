-- Migration: add lottery extended prize & user bonus window columns
-- Adds range_min, range_max to lottery_prizes
-- Adds free_quota_until, double_cost_until to users

ALTER TABLE lottery_prizes ADD COLUMN IF NOT EXISTS range_min INT DEFAULT 0;
ALTER TABLE lottery_prizes ADD COLUMN IF NOT EXISTS range_max INT DEFAULT 0;

ALTER TABLE users ADD COLUMN IF NOT EXISTS free_quota_until BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS double_cost_until BIGINT DEFAULT 0;
