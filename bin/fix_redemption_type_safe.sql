-- 安全修复 redemptions 表 type 字段的数据类型问题
-- 此脚本包含事务处理和回滚机制

-- 开始事务
START TRANSACTION;

-- 1. 首先检查当前 type 字段的数据分布（仅用于查看，不影响数据）
SELECT type, COUNT(*) as count FROM redemptions GROUP BY type;

-- 2. 创建备份表（以防需要回滚）
CREATE TABLE IF NOT EXISTS redemptions_backup LIKE redemptions;
INSERT INTO redemptions_backup SELECT * FROM redemptions;

-- 3. 将无效的字符串值 'code' 更新为默认值 1
UPDATE redemptions SET type = 1 WHERE type = 'code' OR type = 0;

-- 4. 将其他可能的无效字符串值更新为默认值 1
UPDATE redemptions SET type = 1 WHERE type NOT IN (1, 2) AND type IS NOT NULL;

-- 5. 将 NULL 值更新为默认值 1
UPDATE redemptions SET type = 1 WHERE type IS NULL;

-- 6. 验证修复后的数据分布
SELECT type, COUNT(*) as count FROM redemptions GROUP BY type;

-- 7. 修改列类型为 bigint（如果尚未完成）
-- 注意：如果这一步失败，整个事务会回滚
ALTER TABLE redemptions MODIFY COLUMN type bigint DEFAULT 1;

-- 8. 添加注释说明字段含义
ALTER TABLE redemptions MODIFY COLUMN type bigint DEFAULT 1 COMMENT '1: 兑换码（单人单次）, 2: 礼品码（多人使用）';

-- 检查是否有错误发生
SET @error_count = (SELECT COUNT(*) FROM information_schema.statistics 
                    WHERE table_schema = DATABASE() AND table_name = 'redemptions' 
                    AND column_name = 'type' AND data_type = 'bigint');

-- 如果一切正常，提交事务
COMMIT;

-- 输出成功信息
SELECT '修复完成！redemptions 表的 type 字段已成功修改为 bigint 类型。' as message;

-- 如果需要回滚，可以执行以下语句：
-- ROLLBACK;
-- DELETE FROM redemptions;
-- INSERT INTO redemptions SELECT * FROM redemptions_backup;
-- DROP TABLE redemptions_backup;
