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
			common.SysLog("warning: user group '" + group + "' for method '" + method + "' does not exist, using default")
			newGroups[method] = "default"
		}
	}

	defaultUserGroups = newGroups
	return nil
}

// GetDefaultUserGroupForMethod 获取指定注册方式的默认用户组
func GetDefaultUserGroupForMethod(method string) string {
	defaultUserGroupsMutex.RLock()
	defer defaultUserGroupsMutex.RUnlock()

	if group, ok := defaultUserGroups[method]; ok {
		return group
	}
	return "default"
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

		// 验证可选分组是否存在
		validGroups := make([]string, 0)
		for _, group := range availableGroups {
			if group == "default" || GroupInUserUsableGroups(group) {
				validGroups = append(validGroups, group)
			} else {
				common.SysLog("warning: available group '" + group + "' for user group '" + userGroup + "' does not exist, removing")
			}
		}
		newGroups[userGroup] = validGroups
	}

	groupAvailableGroups = newGroups
	return nil
}

// GetAvailableGroupsForUserGroup 获取指定用户组的可选分组列表
func GetAvailableGroupsForUserGroup(userGroup string) []string {
	groupAvailableGroupsMutex.RLock()
	defer groupAvailableGroupsMutex.RUnlock()

	if groups, ok := groupAvailableGroups[userGroup]; ok {
		return groups
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
				common.SysLog("warning: extra user group '" + group + "' for method '" + method + "' does not exist, removing")
			}
		}
		newGroups[method] = validGroups
	}

	defaultExtraUserGroups = newGroups
	return nil
}

// GetDefaultExtraUserGroupsForMethod 获取指定注册方式的默认额外用户组
func GetDefaultExtraUserGroupsForMethod(method string) []string {
	defaultExtraUserGroupsMutex.RLock()
	defer defaultExtraUserGroupsMutex.RUnlock()

	if groups, ok := defaultExtraUserGroups[method]; ok {
		return groups
	}
	return []string{}
}

// SetDefaultExtraUserGroupsForMethod 设置指定注册方式的默认额外用户组
func SetDefaultExtraUserGroupsForMethod(method string, groups []string) {
	defaultExtraUserGroupsMutex.Lock()
	defer defaultExtraUserGroupsMutex.Unlock()

	defaultExtraUserGroups[method] = groups
}
