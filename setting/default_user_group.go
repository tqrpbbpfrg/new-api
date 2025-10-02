package setting

import (
	"encoding/json"
	"one-api/common"
	"sync"
)

// 默认用户组配置
// key: 注册方式 (email, github, oidc, wechat, telegram, discord, linuxdo)
// value: 默认用户组名称
var defaultUserGroups = map[string]string{
	"email":    "default",
	"github":   "default",
	"oidc":     "default",
	"wechat":   "default",
	"telegram": "default",
	"discord":  "default",
	"linuxdo":  "default",
}

// 默认额外用户组配置
// key: 注册方式 (email, github, oidc, wechat, telegram, discord, linuxdo)
// value: 默认额外用户组列表
var defaultExtraUserGroups = map[string][]string{
	"email":    {},
	"github":   {},
	"oidc":     {},
	"wechat":   {},
	"telegram": {},
	"discord":  {},
	"linuxdo":  {},
}
var defaultExtraUserGroupsMutex sync.RWMutex

// 用户组可选分组配置
// key: 用户组名称
// value: 该用户组可以选择的分组列表
var groupAvailableGroups = map[string][]string{
	"default": {"default", "premium", "channel_a", "channel_b"},
	"vip":     {"vip", "premium", "channel_a", "channel_b", "channel_c"},
}
var groupAvailableGroupsMutex sync.RWMutex

var defaultUserGroupsMutex sync.RWMutex

// GetDefaultUserGroupsCopy 获取默认用户组配置的副本
func GetDefaultUserGroupsCopy() map[string]string {
	defaultUserGroupsMutex.RLock()
	defer defaultUserGroupsMutex.RUnlock()

	copy := make(map[string]string)
	for k, v := range defaultUserGroups {
		copy[k] = v
	}
	return copy
}

// DefaultUserGroups2JSONString 将默认用户组配置转换为JSON字符串
func DefaultUserGroups2JSONString() string {
	defaultUserGroupsMutex.RLock()
	defer defaultUserGroupsMutex.RUnlock()

	jsonBytes, err := json.Marshal(defaultUserGroups)
	if err != nil {
		common.SysLog("error marshalling default user groups: " + err.Error())
		return "{}"
	}
	return string(jsonBytes)
}

// UpdateDefaultUserGroupsByJSONString 根据JSON字符串更新默认用户组配置
func UpdateDefaultUserGroupsByJSONString(jsonStr string) error {
	defaultUserGroupsMutex.Lock()
	defer defaultUserGroupsMutex.Unlock()

	var newGroups map[string]string
	if err := json.Unmarshal([]byte(jsonStr), &newGroups); err != nil {
		return err
	}

	// 验证所有配置的用户组是否存在
	for method, group := range newGroups {
		if group == "" {
			// 如果为空，设置为默认组
			newGroups[method] = "default"
			continue
		}

		// 检查用户组是否存在（除了default组）
		if group != "default" && !GroupInUserUsableGroups(group) {
			// 不再回退为 default，而是自动加入 userUsableGroups，便于初始化后新增分组直接生效
			common.SysLog("info: user group '" + group + "' for method '" + method + "' does not exist in user usable groups, auto registering it")
			userUsableGroupsMutex.Lock()
			// 仅当仍不存在时写入，描述暂用组名本身
			if _, exists := userUsableGroups[group]; !exists {
				userUsableGroups[group] = group
			}
			userUsableGroupsMutex.Unlock()
		}
	}

	defaultUserGroups = newGroups

	// 更新配置后同步用户组，确保所有配置的用户组都已注册
	go ValidateAndRegisterUserGroups(newGroups)

	return nil
}

// GetDefaultUserGroupForMethod 获取指定注册方式的默认用户组
func GetDefaultUserGroupForMethod(method string) string {
	// 读取当前映射（只持有读锁期间不做升级操作）
	defaultUserGroupsMutex.RLock()
	group, ok := defaultUserGroups[method]
	defaultUserGroupsMutex.RUnlock()

	if !ok || group == "" {
		return "default"
	}

	if group != "default" && !GroupInUserUsableGroups(group) {
		// 初始化后新增 / 修改的组，运行期第一次被引用时自动注册
		common.SysLog("info: auto-registering missing user group '" + group + "' for method '" + method + "'")
		EnsureUserGroupExists(group)
	}
	return group
}

// SetDefaultUserGroupForMethod 设置指定注册方式的默认用户组
func SetDefaultUserGroupForMethod(method, group string) {
	defaultUserGroupsMutex.Lock()
	defer defaultUserGroupsMutex.Unlock()

	defaultUserGroups[method] = group
}

// GetGroupAvailableGroupsCopy 获取用户组可选分组配置的副本
func GetGroupAvailableGroupsCopy() map[string][]string {
	groupAvailableGroupsMutex.RLock()
	defer groupAvailableGroupsMutex.RUnlock()

	copy := make(map[string][]string)
	for k, v := range groupAvailableGroups {
		copy[k] = make([]string, len(v))
		for i, item := range v {
			copy[k][i] = item
		}
	}
	return copy
}

// GroupAvailableGroups2JSONString 将用户组可选分组配置转换为JSON字符串
func GroupAvailableGroups2JSONString() string {
	groupAvailableGroupsMutex.RLock()
	defer groupAvailableGroupsMutex.RUnlock()

	jsonBytes, err := json.Marshal(groupAvailableGroups)
	if err != nil {
		common.SysLog("error marshalling group available groups: " + err.Error())
		return "{}"
	}
	return string(jsonBytes)
}

// UpdateGroupAvailableGroupsByJSONString 根据JSON字符串更新用户组可选分组配置
func UpdateGroupAvailableGroupsByJSONString(jsonStr string) error {
	groupAvailableGroupsMutex.Lock()
	defer groupAvailableGroupsMutex.Unlock()

	var newGroups map[string][]string
	if err := json.Unmarshal([]byte(jsonStr), &newGroups); err != nil {
		return err
	}

	// 验证所有配置的分组是否存在
	for userGroup, availableGroups := range newGroups {
		// 验证用户组本身是否存在
		if userGroup != "default" && !GroupInUserUsableGroups(userGroup) {
			common.SysLog("warning: user group '" + userGroup + "' does not exist, removing from config")
			delete(newGroups, userGroup)
			continue
		}

		// 验证可选分组是否存在，但保留管理员配置的分组
		validGroups := make([]string, 0)
		for _, group := range availableGroups {
			if group == "default" || GroupInUserUsableGroups(group) {
				validGroups = append(validGroups, group)
			} else {
				// 如果分组不在全局可用分组中，自动添加到全局可用分组
				// 这样可以确保管理员配置的分组不会被丢失
				common.SysLog("info: adding new available group '" + group + "' to global user usable groups")
				userUsableGroupsMutex.Lock()
				userUsableGroups[group] = group
				userUsableGroupsMutex.Unlock()
				validGroups = append(validGroups, group)
			}
		}
		newGroups[userGroup] = validGroups
	}

	groupAvailableGroups = newGroups

	// 更新配置后同步可选分组，确保所有配置的用户组都已注册
	go func() {
		allGroups := make([]string, 0)
		for _, groups := range newGroups {
			allGroups = append(allGroups, groups...)
		}
		EnsureUserGroupsExist(allGroups)
	}()

	return nil
}

// GetAvailableGroupsForUserGroup 获取指定用户组的可选分组列表
func GetAvailableGroupsForUserGroup(userGroup string) []string {
	groupAvailableGroupsMutex.RLock()
	groups, ok := groupAvailableGroups[userGroup]
	groupAvailableGroupsMutex.RUnlock()

	if ok {
		// 验证所有配置的可选分组是否存在，如果不存在则尝试自动注册
		validGroups := make([]string, 0, len(groups))
		needsRegistration := false

		for _, group := range groups {
			if group == "" {
				continue
			}

			if group == "default" || GroupInUserUsableGroups(group) {
				validGroups = append(validGroups, group)
			} else {
				// 标记需要注册新分组
				needsRegistration = true
				validGroups = append(validGroups, group)
			}
		}

		// 如果有需要注册的分组，获取写锁进行批量注册
		if needsRegistration {
			groupAvailableGroupsMutex.Lock()
			userUsableGroupsMutex.Lock()

			for _, group := range groups {
				if group != "" && group != "default" && !GroupInUserUsableGroups(group) {
					common.SysLog("info: auto-registering available group '" + group + "' for user group '" + userGroup + "'")
					userUsableGroups[group] = group // 使用组名作为描述
				}
			}

			userUsableGroupsMutex.Unlock()
			groupAvailableGroupsMutex.Unlock()
		}

		return validGroups
	}

	// 如果没有配置，返回默认的可选分组
	if userGroup == "default" {
		return []string{"default", "premium"}
	}

	// 返回包含用户组本身的默认配置
	return []string{userGroup, "default"}
}

// SetAvailableGroupsForUserGroup 设置指定用户组的可选分组列表
func SetAvailableGroupsForUserGroup(userGroup string, groups []string) {
	groupAvailableGroupsMutex.Lock()
	defer groupAvailableGroupsMutex.Unlock()

	groupAvailableGroups[userGroup] = groups
}

// GetDefaultExtraUserGroupsCopy 获取默认额外用户组配置的副本
func GetDefaultExtraUserGroupsCopy() map[string][]string {
	defaultExtraUserGroupsMutex.RLock()
	defer defaultExtraUserGroupsMutex.RUnlock()

	copy := make(map[string][]string)
	for k, v := range defaultExtraUserGroups {
		copy[k] = make([]string, len(v))
		for i, item := range v {
			copy[k][i] = item
		}
	}
	return copy
}

// DefaultExtraUserGroups2JSONString 将默认额外用户组配置转换为JSON字符串
func DefaultExtraUserGroups2JSONString() string {
	defaultExtraUserGroupsMutex.RLock()
	defer defaultExtraUserGroupsMutex.RUnlock()

	jsonBytes, err := json.Marshal(defaultExtraUserGroups)
	if err != nil {
		common.SysLog("error marshalling default extra user groups: " + err.Error())
		return "{}"
	}
	return string(jsonBytes)
}

// UpdateDefaultExtraUserGroupsByJSONString 根据JSON字符串更新默认额外用户组配置
func UpdateDefaultExtraUserGroupsByJSONString(jsonStr string) error {
	defaultExtraUserGroupsMutex.Lock()
	defer defaultExtraUserGroupsMutex.Unlock()

	var newGroups map[string][]string
	if err := json.Unmarshal([]byte(jsonStr), &newGroups); err != nil {
		return err
	}

	// 验证所有配置的额外用户组是否存在
	for method, groups := range newGroups {
		validGroups := make([]string, 0)
		for _, group := range groups {
			if group == "" {
				continue // 跳过空组
			}
			// 检查用户组是否存在（除了default组）
			if group == "default" || GroupInUserUsableGroups(group) {
				validGroups = append(validGroups, group)
			} else {
				// 自动注册缺失的分组，避免需要严格顺序
				common.SysLog("info: extra user group '" + group + "' for method '" + method + "' does not exist in user usable groups, auto registering it")
				userUsableGroupsMutex.Lock()
				if _, exists := userUsableGroups[group]; !exists {
					userUsableGroups[group] = group
				}
				userUsableGroupsMutex.Unlock()
				validGroups = append(validGroups, group)
			}
		}
		newGroups[method] = validGroups
	}

	defaultExtraUserGroups = newGroups

	// 更新配置后同步额外用户组，确保所有配置的用户组都已注册
	go func() {
		allGroups := make([]string, 0)
		for _, groups := range newGroups {
			allGroups = append(allGroups, groups...)
		}
		EnsureUserGroupsExist(allGroups)
	}()

	return nil
}

// GetDefaultExtraUserGroupsForMethod 获取指定注册方式的默认额外用户组
func GetDefaultExtraUserGroupsForMethod(method string) []string {
	defaultExtraUserGroupsMutex.RLock()
	groups, ok := defaultExtraUserGroups[method]
	defaultExtraUserGroupsMutex.RUnlock()

	if !ok {
		return []string{}
	}

	// 验证所有配置的额外用户组是否存在，如果不存在则尝试自动注册
	validGroups := make([]string, 0, len(groups))
	needsRegistration := false

	for _, group := range groups {
		if group == "" {
			continue
		}

		if group == "default" || GroupInUserUsableGroups(group) {
			validGroups = append(validGroups, group)
		} else {
			// 标记需要注册新分组
			needsRegistration = true
			validGroups = append(validGroups, group)
		}
	}

	// 如果有需要注册的分组，获取写锁进行批量注册
	if needsRegistration {
		defaultExtraUserGroupsMutex.Lock()
		userUsableGroupsMutex.Lock()

		for _, group := range groups {
			if group != "" && group != "default" && !GroupInUserUsableGroups(group) {
				common.SysLog("info: auto-registering extra user group '" + group + "' for method '" + method + "'")
				userUsableGroups[group] = group // 使用组名作为描述
			}
		}

		userUsableGroupsMutex.Unlock()
		defaultExtraUserGroupsMutex.Unlock()
	}

	return validGroups
}

// SetDefaultExtraUserGroupsForMethod 设置指定注册方式的默认额外用户组
func SetDefaultExtraUserGroupsForMethod(method string, groups []string) {
	defaultExtraUserGroupsMutex.Lock()
	defer defaultExtraUserGroupsMutex.Unlock()

	defaultExtraUserGroups[method] = groups
}

// EnsureUserGroupExists 确保用户组存在，如果不存在则自动注册
// 这个函数提供了统一的用户组自动注册机制
func EnsureUserGroupExists(groupName string) bool {
	if groupName == "" || groupName == "default" {
		return true
	}

	if GroupInUserUsableGroups(groupName) {
		return true
	}

	// 自动注册缺失的用户组
	common.SysLog("info: auto-registering user group '" + groupName + "'")
	userUsableGroupsMutex.Lock()
	defer userUsableGroupsMutex.Unlock()

	// 双重检查，防止并发问题
	if _, exists := userUsableGroups[groupName]; !exists {
		userUsableGroups[groupName] = groupName // 使用组名作为描述
		common.SysLog("success: user group '" + groupName + "' has been auto-registered")
		return true
	}

	return true
}

// EnsureUserGroupsExist 批量确保多个用户组存在
func EnsureUserGroupsExist(groupNames []string) {
	if len(groupNames) == 0 {
		return
	}

	needsRegistration := make([]string, 0)

	// 检查哪些分组需要注册
	for _, groupName := range groupNames {
		if groupName != "" && groupName != "default" && !GroupInUserUsableGroups(groupName) {
			needsRegistration = append(needsRegistration, groupName)
		}
	}

	// 批量注册缺失的分组
	if len(needsRegistration) > 0 {
		userUsableGroupsMutex.Lock()
		defer userUsableGroupsMutex.Unlock()

		for _, groupName := range needsRegistration {
			if _, exists := userUsableGroups[groupName]; !exists {
				userUsableGroups[groupName] = groupName
				common.SysLog("info: auto-registered user group '" + groupName + "'")
			}
		}
	}
}

// ValidateAndRegisterUserGroups 验证并注册用户组配置
// 这个函数用于在更新配置时确保所有引用的用户组都存在
func ValidateAndRegisterUserGroups(configGroups map[string]string) {
	// 收集所有需要验证的用户组
	allGroups := make(map[string]bool)
	for _, group := range configGroups {
		if group != "" && group != "default" {
			allGroups[group] = true
		}
	}

	// 批量注册缺失的用户组
	if len(allGroups) > 0 {
		groupsToRegister := make([]string, 0, len(allGroups))
		for group := range allGroups {
			groupsToRegister = append(groupsToRegister, group)
		}
		EnsureUserGroupsExist(groupsToRegister)
	}
}

// SyncUserGroupConfigurations 同步用户组配置，确保所有配置的用户组都已注册
// 这个函数会在系统启动或配置更新时调用，确保所有用户组配置的一致性
func SyncUserGroupConfigurations() {
	common.SysLog("info: synchronizing user group configurations")

	// 1. 同步默认用户组配置
	defaultGroups := GetDefaultUserGroupsCopy()
	ValidateAndRegisterUserGroups(defaultGroups)

	// 2. 同步默认额外用户组配置
	extraGroups := GetDefaultExtraUserGroupsCopy()
	allExtraGroups := make([]string, 0)
	for _, groups := range extraGroups {
		allExtraGroups = append(allExtraGroups, groups...)
	}
	EnsureUserGroupsExist(allExtraGroups)

	// 3. 同步用户组可选分组配置
	availableGroups := GetGroupAvailableGroupsCopy()
	allAvailableGroups := make([]string, 0)
	for _, groups := range availableGroups {
		allAvailableGroups = append(allAvailableGroups, groups...)
	}
	EnsureUserGroupsExist(allAvailableGroups)

	common.SysLog("success: user group configurations synchronized")
}
