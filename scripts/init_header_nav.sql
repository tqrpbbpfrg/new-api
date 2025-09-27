-- 初始化顶栏导航模块配置
-- 只在配置不存在、为空或为空对象时插入默认配置，不覆盖现有有效配置

-- 首先尝试插入，如果key已存在会被忽略
INSERT OR IGNORE INTO options (key, value) 
VALUES ('HeaderNavModules', '{"home":true,"console":true,"pricing":{"enabled":true,"requireAuth":false},"docs":true,"about":true}');

-- 然后更新那些值为NULL、空字符串或空对象的记录
UPDATE options 
SET value = '{"home":true,"console":true,"pricing":{"enabled":true,"requireAuth":false},"docs":true,"about":true}'
WHERE key = 'HeaderNavModules' 
  AND (value IS NULL OR value = '' OR value = '{}' OR value = 'null');

-- 提交更改
COMMIT;