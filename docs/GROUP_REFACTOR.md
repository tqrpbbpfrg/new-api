# 用户分组和可选分组重构文档

## 重构日期
2025-02-10

## 问题描述
在重构前，令牌管理中的分组选择器只显示用户**主分组**对应的可选分组，没有考虑用户的**额外用户组**。

### 示例场景
- 用户A的主分组：`default`
- 用户A的额外用户组：`vip`
- `default` 组的可选分组：`default`, `premium`, `channel_a`, `channel_b`
- `vip` 组的可选分组：`vip`, `premium`, `channel_a`, `channel_b`, `channel_c`

**重构前问题**：
在令牌管理中，用户A只能看到 `default`, `premium`, `channel_a`, `channel_b` 这4个分组。

**重构后预期**：
在令牌管理中，用户A应该能看到所有可选分组的并集：`default`, `premium`, `channel_a`, `channel_b`, `vip`, `channel_c`

## 架构说明

### 分组体系
系统中有三层分组概念：

1. **用户可用分组（UserUsableGroups）**
   - 定义：系统中所有可用的分组及其描述
   - 存储位置：`setting/user_usable_group.go`
   - 示例：`{"default": "默认分组", "vip": "VIP分组", "premium": "高级分组"}`

2. **用户组可选分组配置（GroupAvailableGroups）**
   - 定义：指定每个用户组可以选择哪些分组（主从关系）
   - 存储位置：`setting/default_user_group.go`
   - 示例：
     ```json
     {
       "default": ["default", "premium", "channel_a", "channel_b"],
       "vip": ["vip", "premium", "channel_a", "channel_b", "channel_c"]
     }
     ```

3. **用户分组（User Groups）**
   - **主分组（Group）**：用户的主要分组
   - **额外用户组（ExtraGroups）**：用户可以拥有的额外分组列表
   - 存储位置：`model/user.go`

### 关键函数

#### model/user.go
```go
// GetAllGroups 获取用户的所有用户组（主用户组 + 额外用户组）
func (user *User) GetAllGroups() []string
```

#### setting/user_usable_group.go
```go
// GetUserUsableGroups 根据用户组获取可选分组列表
func GetUserUsableGroups(userGroup string) map[string]string
```

#### setting/default_user_group.go
```go
// GetAvailableGroupsForUserGroup 获取指定用户组的可选分组列表
func GetAvailableGroupsForUserGroup(userGroup string) []string
```

## 修改内容

### 文件：controller/group.go

#### 修改前的 GetUserGroups 函数
```go
func GetUserGroups(c *gin.Context) {
    usableGroups := make(map[string]map[string]interface{})
    userGroup := ""
    userId := c.GetInt("id")
    userGroup, _ = model.GetUserGroup(userId, false)
    
    // 只根据主分组获取可选分组
    for groupName, ratio := range ratio_setting.GetGroupRatioCopy() {
        userUsableGroups := setting.GetUserUsableGroups(userGroup)
        if desc, ok := userUsableGroups[groupName]; ok {
            usableGroups[groupName] = map[string]interface{}{
                "ratio": ratio,
                "desc":  desc,
            }
        }
    }
    // ...
}
```

#### 修改后的 GetUserGroups 函数
```go
func GetUserGroups(c *gin.Context) {
    usableGroups := make(map[string]map[string]interface{})
    userId := c.GetInt("id")
    
    // 获取用户信息，包括主分组和额外分组
    user, err := model.GetUserById(userId, false)
    if err != nil {
        c.JSON(http.StatusOK, gin.H{
            "success": false,
            "message": "获取用户信息失败",
            "data":    usableGroups,
        })
        return
    }
    
    // 获取用户的所有分组（主分组 + 额外分组）
    allUserGroups := user.GetAllGroups()
    
    // 收集所有分组的可选分组（去重）
    availableGroupsSet := make(map[string]bool)
    for _, userGroup := range allUserGroups {
        userUsableGroups := setting.GetUserUsableGroups(userGroup)
        for groupName := range userUsableGroups {
            availableGroupsSet[groupName] = true
        }
    }
    
    // 构建返回数据
    for groupName, ratio := range ratio_setting.GetGroupRatioCopy() {
        if availableGroupsSet[groupName] {
            // 从任一用户组中获取描述（优先使用主分组的描述）
            desc := ""
            for _, userGroup := range allUserGroups {
                userUsableGroups := setting.GetUserUsableGroups(userGroup)
                if d, ok := userUsableGroups[groupName]; ok {
                    desc = d
                    break
                }
            }
            usableGroups[groupName] = map[string]interface{}{
                "ratio": ratio,
                "desc":  desc,
            }
        }
    }
    
    // 处理 auto 分组
    if setting.GroupInUserUsableGroups("auto") {
        usableGroups["auto"] = map[string]interface{}{
            "ratio": "自动",
            "desc":  setting.GetUsableGroupDescription("auto"),
        }
    }
    
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "",
        "data":    usableGroups,
    })
}
```

## 主要改进

1. **完整获取用户信息**
   - 使用 `model.GetUserById()` 获取完整的用户信息
   - 包括主分组和额外用户组

2. **合并所有可选分组**
   - 遍历用户的所有分组（主分组 + 额外用户组）
   - 收集每个分组的可选分组
   - 使用 Set 进行去重

3. **优先级处理**
   - 当多个用户组都包含同一个可选分组时
   - 优先使用主分组中的描述信息

4. **错误处理**
   - 添加了获取用户信息失败的错误处理

## 测试场景

### 场景1：基本功能测试
1. 创建用户A，主分组为 `default`
2. 为用户A添加额外用户组 `vip`
3. 配置分组可选分组：
   - `default`: `["default", "premium"]`
   - `vip`: `["vip", "channel_a"]`
4. 在令牌管理中应该看到：`default`, `premium`, `vip`, `channel_a`

### 场景2：去重测试
1. 创建用户B，主分组为 `default`
2. 为用户B添加额外用户组 `premium`
3. 配置分组可选分组：
   - `default`: `["default", "premium"]`
   - `premium`: `["premium", "vip"]`
4. 在令牌管理中应该看到：`default`, `premium`, `vip`（premium只出现一次）

### 场景3：无额外用户组
1. 创建用户C，主分组为 `default`，无额外用户组
2. 配置分组可选分组：
   - `default`: `["default", "premium"]`
3. 在令牌管理中应该看到：`default`, `premium`（与原有逻辑一致）

## API 端点

### GET /api/user/self/groups
获取当前用户可用的分组列表（用于令牌管理中的分组选择器）

**响应示例：**
```json
{
  "success": true,
  "message": "",
  "data": {
    "default": {
      "ratio": 1.0,
      "desc": "默认分组"
    },
    "premium": {
      "ratio": 1.5,
      "desc": "高级分组"
    },
    "vip": {
      "ratio": 2.0,
      "desc": "VIP分组"
    }
  }
}
```

## 影响范围

### 后端
- ✅ `controller/group.go` - GetUserGroups 函数
- ✅ `model/user.go` - GetAllGroups 函数（已存在）
- ✅ `setting/user_usable_group.go` - GetUserUsableGroups 函数（已存在）
- ✅ `setting/default_user_group.go` - GetAvailableGroupsForUserGroup 函数（已存在）

### 前端
- ✅ `web/src/components/table/tokens/modals/EditTokenModal.jsx` - 令牌编辑弹窗（使用API）
- ℹ️ 前端无需修改，自动使用新的API返回数据

## 向后兼容性
- ✅ 完全向后兼容
- ✅ 对于没有额外用户组的用户，行为与原来一致
- ✅ API 响应格式保持不变

## 注意事项

1. **性能考虑**
   - 每次调用都会查询用户信息和遍历所有分组
   - 建议在高并发场景下考虑添加缓存

2. **数据一致性**
   - 确保用户的额外用户组在系统中存在
   - 删除用户组时需要同步更新用户的额外用户组

3. **权限控制**
   - 该功能仅影响令牌分组选择
   - 不影响用户实际使用API时的分组权限

## 后续优化建议

1. **缓存优化**
   - 可以将用户的可选分组列表缓存到 Redis
   - 减少数据库查询次数

2. **配置界面优化**
   - 在用户管理界面显示额外用户组
   - 提供可视化的分组关系图

3. **日志记录**
   - 记录分组变更日志
   - 便于追踪和审计

## 总结

本次重构修正了用户分组逻辑，确保令牌管理中的分组选择器能够正确显示用户主分组和所有额外用户组的可选分组并集。这使得用户分组和可选分组的主从关系更加清晰和准确。
