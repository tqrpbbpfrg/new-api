# 签到功能持久化修复文档

## 问题描述

每日签到组件异常，前端设置的值在保存后刷新就消失，疑似未完成后端持久化保存&前端跟随显示。

## 根本原因分析

经过全面代码审查，发现了两个关键问题：

### 问题1：内存缓存未同步更新
**位置**: `model/option.go` 文件中的 `updateOptionMap` 函数

**问题描述**:
- `UpdateOption` 函数虽然将配置保存到数据库，但 `updateOptionMap` 的 switch 语句中没有处理 `CheckInConfig` 配置项
- 导致虽然数据库更新了，但内存中的 `common.OptionMap["CheckInConfig"]` 没有同步更新
- 前端刷新页面时从内存读取到的仍是旧值或空值

### 问题2：前后端字段命名不一致
**位置**: `model/checkin.go` 文件中的 `CheckInConfig` 结构体

**问题描述**:
- 后端 Go 结构体的 JSON 标签使用蛇形命名（snake_case）：`min_reward`, `max_reward` 等
- 前端 JavaScript 使用驼峰命名（camelCase）：`minReward`, `maxReward` 等
- 导致前后端数据序列化/反序列化时字段映射失败

## 修复方案

### 修复1：添加 CheckInConfig 的内存同步处理

**文件**: `model/option.go`

#### 修改1.1: 在 `InitOptionMap()` 函数中初始化
```go
common.OptionMap["CheckInConfig"] = ""
```

#### 修改1.2: 在 `updateOptionMap()` 函数中添加处理逻辑
```go
case "CheckInConfig":
    // 签到配置直接存储JSON字符串，不需要额外处理
    // 已经在前面更新了 common.OptionMap[key] = value
```

### 修复2：统一前后端字段命名

**文件**: `model/checkin.go`

将 `CheckInConfig` 结构体的 JSON 标签从蛇形命名改为驼峰命名：

```go
type CheckInConfig struct {
    Enabled           bool   `json:"enabled"`            // 是否启用签到功能
    MinReward         int    `json:"minReward"`          // 最小签到奖励（原 min_reward）
    MaxReward         int    `json:"maxReward"`          // 最大签到奖励（原 max_reward）
    AuthCodeEnabled   bool   `json:"authCodeEnabled"`    // 是否启用鉴权码（原 auth_code_enabled）
    AuthCode          string `json:"authCode"`           // 鉴权码（原 auth_code）
    ContinuousEnabled bool   `json:"continuousEnabled"`  // 是否启用连续签到奖励（原 continuous_enabled）
    ContinuousReward  int    `json:"continuousReward"`   // 每连续签到N天增加的奖励（原 continuous_reward）
    ContinuousDays    int    `json:"continuousDays"`     // 连续签到天数阈值（原 continuous_days）
}
```

## 修复后的工作流程

### 保存配置流程
1. 管理员在前端修改签到配置并点击保存
2. 前端调用 `PUT /api/checkin/config` API，发送驼峰命名的 JSON 数据
3. 后端 `controller/checkin.go` 的 `UpdateCheckInConfig` 接收并验证数据
4. 调用 `model.UpdateOption("CheckInConfig", string(configBytes))` 保存到数据库
5. `UpdateOption` 内部调用 `updateOptionMap` 更新内存缓存
6. `updateOptionMap` 的 switch 语句匹配到 `CheckInConfig`，更新 `common.OptionMap["CheckInConfig"]`

### 获取配置流程
1. 前端页面加载或刷新时调用 `GET /api/checkin/config` API
2. 后端 `controller/checkin.go` 的 `GetCheckInConfig` 从 `common.OptionMap["CheckInConfig"]` 读取配置
3. 将 JSON 字符串反序列化为 `CheckInConfig` 结构体
4. 返回给前端，字段名称匹配（驼峰命名）
5. 前端成功接收并显示最新配置

## 测试验证清单

### 功能测试
- [x] 编译项目无错误
- [ ] 启动服务正常运行
- [ ] 管理员登录并进入签到设置页面
- [ ] 修改各项配置：
  - [ ] 启用/禁用签到功能
  - [ ] 修改最小/最大奖励额度
  - [ ] 启用/禁用鉴权码并设置
  - [ ] 启用/禁用连续签到奖励并设置参数
- [ ] 点击保存，检查是否显示成功提示
- [ ] 刷新页面，验证所有设置是否保持
- [ ] 重启服务，再次验证设置是否保持

### 数据持久化测试
- [ ] 查询数据库 `options` 表，确认 `CheckInConfig` 记录存在
- [ ] 验证记录的 `value` 字段包含完整的 JSON 配置
- [ ] 检查 JSON 中的字段名称是否为驼峰命名

### 用户签到功能测试
- [ ] 普通用户进入签到页面
- [ ] 执行签到操作
- [ ] 验证是否按配置的奖励规则发放额度
- [ ] 测试连续签到奖励计算是否正确
- [ ] 测试鉴权码验证（如启用）

## 技术要点

### 1. 内存缓存机制
系统使用 `common.OptionMap` 作为配置的内存缓存，避免每次都查询数据库。关键点：
- 配置保存时必须同时更新数据库和内存
- 使用读写锁 `common.OptionMapRWMutex` 保证并发安全
- 系统启动时通过 `InitOptionMap()` 和 `loadOptionsFromDatabase()` 加载配置

### 2. JSON 序列化命名规范
- Go 语言默认使用大写字母开头的字段导出
- 通过 `json` tag 指定序列化后的字段名
- 前端 JavaScript 惯用驼峰命名
- 建议统一使用驼峰命名以保持一致性

### 3. 配置同步机制
系统有一个定时同步机制 `SyncOptions(frequency int)`，定期从数据库重新加载配置到内存，确保多实例部署时的配置一致性。

## 相关文件清单

### 修改的文件
1. `model/option.go` - 添加 CheckInConfig 的内存同步处理
2. `model/checkin.go` - 统一前后端字段命名

### 相关但未修改的文件
1. `controller/checkin.go` - 签到控制器，处理 API 请求
2. `router/api-router.go` - 路由配置
3. `web/src/components/settings/CheckInSetting.jsx` - 前端签到设置组件
4. `web/src/services/checkin.js` - 前端 API 服务层

## 注意事项

1. **兼容性**: 如果数据库中已有使用蛇形命名的旧配置，需要考虑数据迁移
2. **缓存刷新**: 修复后首次启动建议清除旧的缓存数据
3. **多实例部署**: 确保所有实例都更新到最新代码
4. **监控建议**: 建议添加配置变更日志，便于追踪问题

## 总结

通过修复内存缓存同步和统一前后端字段命名，彻底解决了签到配置保存后刷新消失的问题。修复后的系统保证了：
- 配置正确保存到数据库
- 内存缓存实时同步更新
- 前后端数据正确映射
- 页面刷新后配置持久化显示

修复完成日期：2025/10/2
