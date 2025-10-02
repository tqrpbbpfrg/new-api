-- 添加Discord用户名字段
ALTER TABLE users ADD COLUMN discord_username VARCHAR(100) DEFAULT NULL COMMENT 'Discord用户名';

-- 为Discord用户名字段添加索引
CREATE INDEX idx_users_discord_username ON users(discord_username);
