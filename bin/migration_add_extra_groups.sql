-- 为用户表添加额外用户组字段
ALTER TABLE users ADD COLUMN extra_groups TEXT DEFAULT NULL COMMENT '额外用户组，JSON格式存储';

-- 为现有用户设置默认的额外用户组（可选）
-- 这里可以为特定用户组设置默认的额外用户组
-- 例如：为VIP用户添加额外的渠道分组
-- UPDATE users SET extra_groups = '["channel_a", "channel_b"]' WHERE `group` = 'vip';

-- 添加索引以提高查询性能（可选）
-- CREATE INDEX idx_users_extra_groups ON users((CAST(extra_groups AS CHAR(255))));

-- 添加注释说明
ALTER TABLE users MODIFY COLUMN extra_groups TEXT DEFAULT NULL COMMENT '额外用户组，JSON格式存储，用户可以同时拥有主用户组和额外用户组的权限';
