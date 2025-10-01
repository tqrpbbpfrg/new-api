# 签到功能测试指南

## 测试环境准备

### 1. 启动服务
```bash
# Windows
new-api.exe

# Linux
./new-api
```

### 2. 访问管理后台
打开浏览器访问：`http://localhost:3000`（或您配置的端口）

---

## 测试清单

### 一、配置保存测试 ✓

#### 1.1 基础配置测试
- [ ] 登录管理员账户
- [ ] 进入 **系统设置 → 签到设置**
- [ ] 启用签到功能（勾选"启用"）
- [ ] 设置最小奖励：`10`
- [ ] 设置最大奖励：`100`
- [ ] 点击"保存"按钮
- [ ] **验证点**：页面显示保存成功提示

#### 1.2 配置持久化测试
- [ ] 点击浏览器刷新按钮（F5）
- [ ] **验证点**：所有配置值应保持不变
  - 启用状态：✓ 勾选
  - 最小奖励：10
  - 最大奖励：100

#### 1.3 鉴权码配置测试
- [ ] 启用"启用鉴权码"
- [ ] 设置鉴权码：`TEST2025`
- [ ] 点击"保存"
- [ ] 刷新页面
- [ ] **验证点**：鉴权码配置保持

#### 1.4 连续签到奖励测试
- [ ] 启用"启用连续签到奖励"
- [ ] 设置连续签到天数：`7`
- [ ] 设置连续签到奖励：`500`
- [ ] 点击"保存"
- [ ] 刷新页面
- [ ] **验证点**：连续签到配置保持

---

### 二、服务重启测试 ✓

#### 2.1 完整配置并重启
- [ ] 完成上述所有配置
- [ ] 停止服务（Ctrl+C）
- [ ] 重新启动服务
- [ ] 重新登录管理后台
- [ ] 进入签到设置页面
- [ ] **验证点**：所有配置从数据库正确加载

---

### 三、用户签到功能测试 ✓

#### 3.1 基础签到（无鉴权码）
- [ ] 先关闭鉴权码功能
- [ ] 点击"保存"
- [ ] 切换到普通用户账户
- [ ] 进入签到页面
- [ ] 点击"签到"按钮
- [ ] **验证点**：
  - 签到成功提示
  - 获得奖励金额在 min~max 范围内
  - 用户余额增加
  - 签到按钮变为已签到状态

#### 3.2 鉴权码签到
- [ ] 切换回管理员账户
- [ ] 启用鉴权码，设置为：`CHECKIN123`
- [ ] 保存配置
- [ ] 切换到普通用户账户
- [ ] 刷新签到页面
- [ ] **验证点**：应显示鉴权码输入框

##### 3.2.1 错误鉴权码测试
- [ ] 输入错误鉴权码：`WRONG`
- [ ] 点击签到
- [ ] **验证点**：显示"鉴权码错误"提示

##### 3.2.2 正确鉴权码测试
- [ ] 输入正确鉴权码：`CHECKIN123`
- [ ] 点击签到
- [ ] **验证点**：签到成功，获得奖励

#### 3.3 重复签到限制测试
- [ ] 已签到的账户再次点击签到
- [ ] **验证点**：提示"今日已签到"

#### 3.4 连续签到奖励测试
- [ ] 管理员启用连续签到：7天，奖励500
- [ ] 使用测试账户连续签到（可能需要修改数据库时间模拟）
- [ ] 第7天签到时
- [ ] **验证点**：额外获得500奖励

---

### 四、数据库验证 ✓

#### 4.1 检查配置表
```sql
-- SQLite
SELECT key, value FROM options WHERE key = 'CheckInConfig';

-- MySQL
SELECT `key`, `value` FROM `options` WHERE `key` = 'CheckInConfig';
```

**验证点**：
- 记录存在
- `value` 字段为 JSON 格式
- JSON 字段使用驼峰命名：
```json
{
  "enabled": true,
  "minReward": 10,
  "maxReward": 100,
  "authCodeEnabled": true,
  "authCode": "TEST2025",
  "continuousEnabled": true,
  "continuousReward": 500,
  "continuousDays": 7
}
```

#### 4.2 检查签到记录表
```sql
-- 查看用户签到记录
SELECT user_id, check_in_date, reward FROM check_ins 
ORDER BY check_in_date DESC 
LIMIT 10;
```

**验证点**：
- 每次签到有记录
- reward 值在配置范围内
- 连续签到有额外记录

---

### 五、API 接口测试 ✓

#### 5.1 获取配置接口
```bash
curl -X GET http://localhost:3000/api/checkin/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**期望响应**：
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "minReward": 10,
    "maxReward": 100,
    "authCodeEnabled": true,
    "authCode": "TEST2025",
    "continuousEnabled": true,
    "continuousReward": 500,
    "continuousDays": 7
  }
}
```

#### 5.2 更新配置接口
```bash
curl -X POST http://localhost:3000/api/checkin/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "minReward": 20,
    "maxReward": 200,
    "authCodeEnabled": false,
    "authCode": "",
    "continuousEnabled": false,
    "continuousReward": 0,
    "continuousDays": 0
  }'
```

**期望响应**：
```json
{
  "success": true,
  "message": "签到配置已更新"
}
```

#### 5.3 用户签到接口
```bash
# 无鉴权码
curl -X POST http://localhost:3000/api/checkin/ \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# 有鉴权码
curl -X POST http://localhost:3000/api/checkin/ \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"authCode": "CHECKIN123"}'
```

---

## 问题排查

### 如果配置保存后刷新丢失

1. **检查后端日志**
```bash
# 查找配置更新日志
grep "CheckInConfig" ./logs/*.log
```

2. **检查数据库连接**
```sql
-- 确认数据库可写入
INSERT INTO options (`key`, value) VALUES ('test_key', 'test_value');
SELECT * FROM options WHERE `key` = 'test_key';
DELETE FROM options WHERE `key` = 'test_key';
```

3. **检查内存缓存**
- 重启服务后立即访问配置
- 如果重启后丢失 = 数据库问题
- 如果刷新页面丢失 = 内存缓存问题

### 如果签到功能异常

1. **检查前端控制台**
- F12 打开开发者工具
- 查看 Network 标签，观察 API 请求响应
- 查看 Console 标签，观察错误信息

2. **检查字段匹配**
```javascript
// 前端发送的数据
console.log('Request:', { authCode: 'xxx' });

// 后端接收的字段
// 应该在日志中看到匹配的字段名
```

3. **检查权限**
- 确认用户有签到权限
- 确认用户组配置正确

---

## 测试通过标准

✅ **所有测试项打勾**
✅ **配置保存后刷新不丢失**
✅ **服务重启后配置保持**
✅ **用户可正常签到**
✅ **鉴权码验证正常**
✅ **数据库记录正确**
✅ **字段命名统一为驼峰**

---

## 测试报告模板

```markdown
## 签到功能测试报告

**测试日期**: 2025/XX/XX
**测试人员**: XXX
**测试环境**: 
- 操作系统: Windows 11 / Linux
- 数据库: SQLite / MySQL
- 版本: vX.X.X

### 测试结果

#### 配置保存测试
- [x] 基础配置保存 - ✅ 通过
- [x] 刷新后保持 - ✅ 通过
- [x] 鉴权码配置 - ✅ 通过
- [x] 连续签到配置 - ✅ 通过

#### 服务重启测试
- [x] 重启后配置保持 - ✅ 通过

#### 签到功能测试
- [x] 基础签到 - ✅ 通过
- [x] 鉴权码签到 - ✅ 通过
- [x] 重复签到限制 - ✅ 通过
- [x] 连续签到奖励 - ✅ 通过

#### 数据库验证
- [x] 配置表记录 - ✅ 通过
- [x] 签到记录表 - ✅ 通过

#### API 接口测试
- [x] 获取配置 - ✅ 通过
- [x] 更新配置 - ✅ 通过
- [x] 用户签到 - ✅ 通过

### 问题记录
无问题 / [描述发现的问题]

### 总结
修复成功，所有功能正常 / [其他说明]
```

---

## 快速验证命令

```bash
# 1. 启动服务
./new-api.exe

# 2. 在另一个终端监控日志
tail -f ./logs/new-api.log | grep -i checkin

# 3. 验证数据库（SQLite）
sqlite3 new-api.db "SELECT key, value FROM options WHERE key = 'CheckInConfig';"
```

---

**注意事项**:
- 测试前建议备份数据库
- 使用测试账户而非生产账户
- 记录每步操作的结果
- 截图保存关键步骤
