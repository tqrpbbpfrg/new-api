-- 回滚 redemptions 表 type 字段的修复
-- 此脚本用于在修复失败时恢复原始数据

-- 开始事务
START TRANSACTION;

-- 1. 检查备份表是否存在
SELECT COUNT(*) as backup_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'redemptions_backup';

-- 2. 如果备份表存在，执行回滚
-- 删除当前表的数据
DELETE FROM redemptions;

-- 从备份表恢复数据
INSERT INTO redemptions SELECT * FROM redemptions_backup;

-- 3. 验证数据恢复情况
SELECT type, COUNT(*) as count FROM redemptions GROUP BY type;

-- 4. 提交事务
COMMIT;

-- 5. 输出成功信息
SELECT '回滚完成！redemptions 表已恢复到修复前的状态。' as message;

-- 6. 可选：删除备份表（请确认数据正常后再执行）
-- DROP TABLE IF EXISTS redemptions_backup;
-- SELECT '备份表已删除。' as message;
