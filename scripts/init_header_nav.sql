-- 初始化顶栏导航模块配置
-- 如果配置不存在或格式错误，插入或更新默认配置

INSERT INTO options (key, value) 
VALUES ('HeaderNavModules', '{"home":true,"console":true,"pricing":{"enabled":true,"requireAuth":false},"docs":true,"about":true}')
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value 
WHERE options.value IS NULL OR options.value = '' OR options.value = '{}';

-- 提交更改
COMMIT;