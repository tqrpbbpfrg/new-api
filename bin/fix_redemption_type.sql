-- 修复 redemptions 表 type 字段的数据类型问题
-- 此脚本将清理无效数据并完成迁移

-- 1. 首先检查当前 type 字段的数据分布
SELECT type, COUNT(*) as count FROM redemptions GROUP BY type;

-- 2. 将无效的字符串值 'code' 更新为默认值 1
UPDATE redemptions SET type = 1 WHERE type = 'code' OR type = 0;

-- 3. 将其他可能的无效字符串值更新为默认值 1
UPDATE redemptions SET type = 1 WHERE type NOT IN (1, 2) AND type IS NOT NULL;

-- 4. 将 NULL 值更新为默认值 1
UPDATE redemptions SET type = 1 WHERE type IS NULL;

-- 5. 验证修复后的数据分布
SELECT type, COUNT(*) as count FROM redemptions GROUP BY type;

-- 6. 修改列类型为 bigint（如果尚未完成）
ALTER TABLE redemptions MODIFY COLUMN type bigint DEFAULT 1;

-- 7. 添加注释说明字段含义
ALTER TABLE redemptions MODIFY COLUMN type bigint DEFAULT 1 COMMENT '1: 兑换码（单人单次）, 2: 礼品码（多人使用）';
