# Discord OAuth 登录修复文档

## 问题描述

Discord OAuth 登录功能出现异常，无法正常完成参数返回并导致登录错误。

## 根本原因分析

1. **状态验证过于严格**：Discord 控制器中的 state 验证逻辑比其他 OAuth 提供商（GitHub、LinuxDO）更复杂，包含了额外的时间验证和多层错误检查，导致在某些情况下验证失败。

2. **Session 管理不一致**：
   - Session 保存操作没有正确处理错误
   - `oauth_state_time` 的清理不完整

3. **错误信息不够明确**：用户无法清楚了解失败的具体原因

## 修复内容

### 1. 简化状态验证逻辑 (controller/discord.go)

**修改前：**
```go
// 包含多层验证和时间检查
if state == "" {
    // 错误处理
}
if sessionState == nil {
    // 错误处理
}
// 检查状态时效性（10分钟）
stateTime := session.Get("oauth_state_time")
if stateTime != nil {
    if time.Now().Unix()-stateTime.(int64) > 600 {
        // 错误处理
    }
}
if state != sessionState.(string) {
    // 错误处理
}
```

**修改后：**
```go
// 与 GitHub/LinuxDO 保持一致的简单验证
if state == "" || sessionState == nil || state != sessionState.(string) {
    common.SysLog(fmt.Sprintf("Discord OAuth 状态验证失败: state=%s, session_state=%v", state, sessionState))
    c.JSON(http.StatusForbidden, gin.H{
        "success": false,
        "message": "Discord 授权状态验证失败，请重新尝试登录",
    })
    return
}
```

### 2. 改进 Session 清理

**修改前：**
```go
session.Delete("oauth_state")
session.Save()
```

**修改后：**
```go
session.Delete("oauth_state")
session.Delete("oauth_state_time")
err = session.Save()
if err != nil {
    common.SysLog(fmt.Sprintf("Discord OAuth 保存会话失败: %v", err))
}
```

### 3. 统一错误处理

所有的 OAuth 相关错误都会：
- 记录到系统日志
- 返回用户友好的错误信息
- 正确清理 session 状态

## 测试步骤

### 前置条件

1. 确保已在 Discord Developer Portal 创建应用
2. 配置正确的 Client ID 和 Client Secret
3. 添加 OAuth2 重定向 URL: `http://your-domain/oauth/discord` 或 `https://your-domain/oauth/discord`
4. 在系统设置中启用 Discord OAuth 登录

### 测试场景

#### 场景 1: 新用户注册登录

1. 访问登录页面
2. 点击"使用 Discord 继续"按钮
3. 在 Discord 授权页面确认授权
4. 验证：
   - 成功跳转回系统
   - 自动创建新用户账号
   - 用户名格式为 `discord_[ID]`
   - 成功登录并跳转到控制台

#### 场景 2: 已有用户登录

1. 使用已绑定 Discord 的账号测试
2. 点击"使用 Discord 继续"
3. 在 Discord 授权页面确认授权
4. 验证：
   - 成功识别已有账号
   - 成功登录并跳转到控制台

#### 场景 3: 账号绑定

1. 使用普通账号登录系统
2. 进入个人设置页面
3. 点击"绑定 Discord"
4. 在 Discord 授权页面确认授权
5. 验证：
   - 成功绑定 Discord 账号
   - 显示绑定成功消息

#### 场景 4: 错误处理

测试以下错误情况：
- [ ] 取消授权（在 Discord 页面点击取消）
- [ ] 授权已过期（等待超时）
- [ ] Discord 账号已被其他用户绑定
- [ ] 管理员关闭了注册功能

## 技术细节

### OAuth 流程

1. **前端触发**：
   - 调用 `/api/oauth/state` 获取 state 参数
   - 构建 Discord 授权 URL
   - 重定向到 Discord 授权页面

2. **Discord 回调**：
   - Discord 重定向到 `/oauth/discord?code=xxx&state=xxx`
   - 前端组件 `OAuth2Callback` 处理回调
   - 调用后端 API `/api/oauth/discord?code=xxx&state=xxx`

3. **后端处理**：
   - 验证 state 参数
   - 使用 code 交换 access_token
   - 获取用户信息
   - 创建或登录用户账号

### 关键代码位置

- **后端控制器**：`controller/discord.go`
- **路由配置**：`router/api-router.go`
- **前端回调组件**：`web/src/components/auth/OAuth2Callback.jsx`
- **前端登录表单**：`web/src/components/auth/LoginForm.jsx`
- **API 辅助函数**：`web/src/helpers/api.js`

### redirect_uri 构建逻辑

后端和前端都使用相同的方式构建 redirect_uri：

**后端 (Go)**：
```go
scheme := "http"
if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
    scheme = "https"
}
redirectURI := fmt.Sprintf("%s://%s/oauth/discord", scheme, c.Request.Host)
```

**前端 (JavaScript)**：
```javascript
const redirectUri = window.location.origin + '/oauth/discord';
```

## 与其他 OAuth 的一致性

修复后，Discord OAuth 的实现与 GitHub、LinuxDO OAuth 保持一致：

| 特性 | GitHub | LinuxDO | Discord (修复后) |
|------|--------|---------|------------------|
| State 验证 | 简单验证 | 简单验证 | ✅ 简单验证 |
| Session 清理 | 完整 | 完整 | ✅ 完整 |
| 错误日志 | 有 | 有 | ✅ 有 |
| 用户创建 | 支持 | 支持 | ✅ 支持 |
| 账号绑定 | 支持 | 支持 | ✅ 支持 |

## 注意事项

1. **重定向 URL 配置**：
   - 必须在 Discord Developer Portal 中配置正确的回调 URL
   - 支持 HTTP（开发环境）和 HTTPS（生产环境）
   - URL 格式：`{protocol}://{domain}/oauth/discord`

2. **Session 配置**：
   - 确保 session 中间件正确配置
   - session 存储应该持久化（Redis 或数据库）

3. **日志监控**：
   - 所有 OAuth 错误都会记录到系统日志
   - 使用 `common.SysLog()` 记录详细信息

## 回归测试建议

在部署前，建议测试以下功能确保没有破坏现有功能：

- [ ] GitHub OAuth 登录
- [ ] LinuxDO OAuth 登录
- [ ] OIDC OAuth 登录
- [ ] 普通用户名密码登录
- [ ] 邮箱验证
- [ ] 2FA 验证

## 相关文件

```
controller/discord.go          # Discord OAuth 主控制器（已修复）
controller/github.go           # GitHub OAuth 参考实现
controller/linuxdo.go          # LinuxDO OAuth 参考实现
router/api-router.go           # 路由配置
web/src/components/auth/OAuth2Callback.jsx  # 前端回调处理
web/src/components/auth/LoginForm.jsx       # 登录表单
web/src/helpers/api.js         # API 辅助函数
```

## 更新日期

2025年10月2日
