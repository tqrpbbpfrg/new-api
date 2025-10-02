# 令牌分组显示问题修复

## 问题描述

用户在编辑令牌时，即使管理员已经配置了用户可选分组，令牌编辑页面也只显示用户自己的分组，而不显示所有可选的分组。

## 问题原因

在 `controller/group.go` 的 `GetUserGroups` 函数中，存在一个逻辑错误：

```go
// 旧的错误逻辑
for groupName, ratio := range ratio_setting.GetGroupRatioCopy() {
    if availableGroupsSet[groupName] {
        // 只有在 ratio 配置中存在的分组才会被返回
    }
}
```

这个逻辑导致只有**同时存在于 ratio 配置和用户可选分组**中的分组才会被返回。如果管理员配置了用户可选分组，但这些分组还没有在 ratio 配置中设置，那么它们就不会显示在令牌编辑页面中。

## 修复方案

修改 `GetUserGroups` 函数的逻辑，改为遍历用户的可选分组集合，而不是 ratio 配置：

```go
// 新的正确逻辑
groupRatios := ratio_setting.GetGroupRatioCopy()
for groupName := range availableGroupsSet {
    // 遍历所有用户可选分组
    
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

修复后，`/api/user/self/groups` 接口将正确返回用户的所有可选分组，包括：

1. 用户主分组对应的可选分组
2. 用户额外分组对应的可选分组
3. 即使这些分组没有在 ratio 配置中，也会显示（使用默认 ratio 1.0）

这样，令牌编辑页面就能正确显示所有管理员配置的用户可选分组了。

## 影响范围

- 影响文件：`controller/group.go`
- 影响接口：`/api/user/self/groups` 和 `/api/user/groups`
- 影响功能：令牌编辑页面的分组选择下拉框

## 测试建议

1. 管理员配置用户可选分组（在系统设置中）
2. 用户登录后进入令牌管理页面
3. 点击创建或编辑令牌
4. 验证分组下拉框中显示了所有配置的可选分组

## 修复日期

2025-10-02
