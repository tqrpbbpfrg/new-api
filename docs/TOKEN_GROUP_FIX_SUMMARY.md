# 令牌分组显示问题修复总结

## 问题描述
用户在编辑令牌时，即使管理员配置了用户可选分组，令牌编辑页面也只显示用户自己的分组（主分组），而不显示所有配置的可选分组。

## 根本原因
在 `controller/group.go` 的 `GetUserGroups` 函数中，存在逻辑错误：

```go
// 错误的逻辑
for groupName, ratio := range ratio_setting.GetGroupRatioCopy() {
    if availableGroupsSet[groupName] {
        // 只返回同时存在于 ratio 配置和用户可选分组中的分组
    }
}
```

这导致只有**同时满足以下两个条件**的分组才会被返回：
1. 存在于用户可选分组配置中
2. 存在于 ratio 配置中

如果管理员配置了用户可选分组，但这些分组没有设置 ratio，它们就不会显示。

## 修复内容

### 1. 修改 `controller/group.go` (第 54-71 行)

**修改前：**
```go
// 构建返回数据
for groupName, ratio := range ratio_setting.GetGroupRatioCopy() {
    if availableGroupsSet[groupName] {
        // 只返回在 ratio 中存在的分组
        ...
    }
}
```

**修改后：**
```go
// 构建返回数据
groupRatios := ratio_setting.GetGroupRatioCopy()
for groupName := range availableGroupsSet {
    // 遍历所有用户可选分组
    
    // 从任一用户组中获取描述
    desc := ""
    for _, userGroup := range allUserGroups {
        userUsableGroups := setting.GetUserUsableGroups(userGroup)
        if d, ok := userUsableGroups[groupName]; ok {
            desc = d
            break
        }
    }
    
    // 获取分组的 ratio，如果不存在则使用默认值
    ratio := groupRatios[groupName]
    if ratio == 0 {
        ratio = 1.0 // 默认比率为 1.0
    }
    
    usableGroups[groupName] = map[string]interface{}{
        "ratio": ratio,
        "desc":  desc,
    }
}
```

## 修复效果

修复后，`/api/user/self/groups` 接口将正确返回：

1. **用户主分组**对应的所有可选分组
2. **用户额外分组**对应的所有可选分组（去重）
3. 即使分组没有配置 ratio，也会显示（使用默认 ratio 1.0）

## 数据流程验证

### 后端流程
1. 用户请求 `/api/user/self/groups`
2. `GetUserGroups` 获取用户信息（包含主分组和额外分组）
3. `GetAllGroups()` 返回用户的所有分组
4. 遍历所有用户分组，调用 `GetUserUsableGroups(userGroup)` 获取每个分组的可选分组
5. 合并去重所有可选分组
6. 返回所有可选分组及其描述和 ratio

### 前端流程
1. `EditTokenModal` 组件的 `loadGroups()` 调用 `/api/user/self/groups`
2. 将返回的数据转换为选项列表格式
3. 在令牌分组下拉框中显示所有选项

## 相关文件

- `controller/group.go` - 修复的主要文件
- `model/user.go` - 提供 `GetAllGroups()` 方法
- `setting/user_usable_group.go` - 提供 `GetUserUsableGroups()` 方法
- `setting/default_user_group.go` - 提供 `GetAvailableGroupsForUserGroup()` 方法
- `web/src/components/table/tokens/modals/EditTokenModal.jsx` - 前端令牌编辑组件

## 测试建议

1. **配置用户可选分组**
   - 进入系统设置 → 用户可选分组管理
   - 为某个用户组配置可选分组列表

2. **测试令牌创建/编辑**
   - 以该用户组的用户身份登录
   - 进入令牌管理页面
   - 创建或编辑令牌
   - 验证"令牌分组"下拉框显示所有配置的可选分组

3. **测试多用户组情况**
   - 配置用户的额外用户组
   - 验证令牌编辑时显示所有用户组的可选分组（去重后）

## 编译状态
✅ 代码已成功编译为 `new-api.exe`

## 修复日期
2025-10-02
