-- 初始化顶栏导航配置
-- 如果配置不存在或无效，则插入默认配置

INSERT OR IGNORE INTO options (key, value) VALUES ('HeaderNavModules', '{"home":true,"console":true,"pricing":{"enabled":true,"requireAuth":false},"docs":true,"about":true}');

-- 更新无效的配置（空字符串、null、空对象等）
UPDATE options 
SET value = '{"home":true,"console":true,"pricing":{"enabled":true,"requireAuth":false},"docs":true,"about":true}' 
WHERE key = 'HeaderNavModules' 
AND (value IS NULL OR value = '' OR value = '{}' OR value = 'null');