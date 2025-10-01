# Redemption 表 Type 字段修复指南

## 问题描述

在系统启动过程中，数据库迁移失败，出现以下错误：

```
Error 1366 (HY000): Incorrect integer value: 'code' for column 'type' at row 1
```

**错误原因：**
- `redemptions` 表的 `type` 列存在字符串值 `'code'`
- 系统试图将该列的数据类型修改为 `bigint`
- MySQL 无法将字符串 `'code'` 转换为整数，导致迁移失败

## 解决方案

### 方案一：使用安全修复脚本（推荐）

1. **执行安全修复脚本：**
   ```bash
   mysql -u your_username -p your_database < bin/fix_redemption_type_safe.sql
   ```

2. **脚本功能：**
   - 创建数据备份表
   - 清理无效数据（将 `'code'` 等字符串值转换为默认值 `1`）
   - 修改列类型为 `bigint`
   - 包含事务处理，失败时会自动回滚

### 方案二：手动修复步骤

1. **连接数据库：**
   ```bash
   mysql -u your_username -p your_database
   ```

2. **检查当前数据分布：**
   ```sql
   SELECT type, COUNT(*) as count FROM redemptions GROUP BY type;
   ```

3. **修复数据：**
   ```sql
   -- 将字符串 'code' 更新为默认值 1
   UPDATE redemptions SET type = 1 WHERE type = 'code' OR type = 0;
   
   -- 将其他无效值更新为默认值 1
   UPDATE redemptions SET type = 1 WHERE type NOT IN (1, 2) AND type IS NOT NULL;
   
   -- 将 NULL 值更新为默认值 1
   UPDATE redemptions SET type = 1 WHERE type IS NULL;
   ```

4. **修改列类型：**
   ```sql
   ALTER TABLE redemptions MODIFY COLUMN type bigint DEFAULT 1 COMMENT '1: 兑换码（单人单次）, 2: 礼品码（多人使用）';
   ```

5. **验证修复结果：**
   ```sql
   SELECT type, COUNT(*) as count FROM redemptions GROUP BY type;
   ```

### 方案三：如果修复失败，执行回滚

如果修复过程中出现问题，可以使用回滚脚本恢复原始数据：

```bash
mysql -u your_username -p your_database < bin/rollback_redemption_type.sql
```

## 字段类型说明

修复后的 `type` 字段定义：
- **数据类型：** `bigint`
- **默认值：** `1`
- **允许值：**
  - `1` - 兑换码（单人单次使用）
  - `2` - 礼品码（多人使用，可设置使用次数限制）

## 预防措施

为避免类似问题再次发生，建议：

1. **数据验证：** 在插入数据前验证字段类型
2. **定期维护：** 定期检查数据库表结构是否与模型定义一致
3. **测试环境：** 在生产环境执行迁移前，先在测试环境验证
4. **备份策略：** 执行重要操作前备份数据

## 文件说明

- `fix_redemption_type.sql` - 基础修复脚本
- `fix_redemption_type_safe.sql` - 安全修复脚本（推荐）
- `rollback_redemption_type.sql` - 回滚脚本
- `README_REDEMPTION_TYPE_FIX.md` - 本说明文档

## 注意事项

1. **备份数据：** 执行修复前请确保已备份数据库
2. **测试环境：** 建议先在测试环境验证修复脚本
3. **权限要求：** 执行脚本需要数据库的 ALTER 和 UPDATE 权限
4. **停机维护：** 建议在系统维护期间执行修复操作

## 技术支持

如果修复过程中遇到问题，请检查：
1. 数据库连接是否正常
2. 用户权限是否足够
3. 是否有其他进程正在访问该表
4. 磁盘空间是否充足
