# 数据库初始化脚本
$sql = @"
INSERT OR IGNORE INTO options (key, value) VALUES ('HeaderNavModules', '{\"home\":{\"name\":\"首页\",\"path\":\"/\",\"icon\":\"IconHome\",\"enabled\":true},\"console\":{\"name\":\"控制台\",\"path\":\"/console\",\"icon\":\"IconApps\",\"enabled\":true},\"token\":{\"name\":\"令牌\",\"path\":\"/console/token\",\"icon\":\"IconKey\",\"enabled\":true},\"channel\":{\"name\":\"渠道\",\"path\":\"/console/channel\",\"icon\":\"IconCloud\",\"enabled\":true},\"pricing\":{\"name\":\"定价\",\"path\":\"/console/pricing\",\"icon\":\"IconCoinMoneyStroked\",\"enabled\":true},\"log\":{\"name\":\"日志\",\"path\":\"/console/log\",\"icon\":\"IconHistogram\",\"enabled\":true}}');
UPDATE options 
SET value = '{\"home\":{\"name\":\"首页\",\"path\":\"/\",\"icon\":\"IconHome\",\"enabled\":true},\"console\":{\"name\":\"控制台\",\"path\":\"/console\",\"icon\":\"IconApps\",\"enabled\":true},\"token\":{\"name\":\"令牌\",\"path\":\"/console/token\",\"icon\":\"IconKey\",\"enabled\":true},\"channel\":{\"name\":\"渠道\",\"path\":\"/console/channel\",\"icon\":\"IconCloud\",\"enabled\":true},\"pricing\":{\"name\":\"定价\",\"path\":\"/console/pricing\",\"icon\":\"IconCoinMoneyStroked\",\"enabled\":true},\"log\":{\"name\":\"日志\",\"path\":\"/console/log\",\"icon\":\"IconHistogram\",\"enabled\":true}}' 
WHERE key = 'HeaderNavModules' 
AND (value IS NULL OR value = '' OR value = '{}' OR value = 'null');
"@

$sql | Out-File -FilePath "temp_init.sql" -Encoding UTF8

# 使用System.Data.SQLite处理数据库
try {
    # 加载SQLite程序集
    Add-Type -Path "System.Data.SQLite.dll" -ErrorAction SilentlyContinue
    
    # 连接数据库
    $connectionString = "Data Source=data.db;Version=3;"
    $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
    $connection.Open()
    
    # 执行SQL
    $command = $connection.CreateCommand()
    $command.CommandText = $sql
    $command.ExecuteNonQuery()
    
    Write-Host "Database initialized successfully!" -ForegroundColor Green
    
    $connection.Close()
} catch {
    Write-Host "Failed to initialize database: $_" -ForegroundColor Red
    # 如果SQLite.NET不可用，输出手动说明
    Write-Host "Please manually execute the SQL commands in temp_init.sql file" -ForegroundColor Yellow
}

# 清理临时文件
Remove-Item "temp_init.sql" -ErrorAction SilentlyContinue