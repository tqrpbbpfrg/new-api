package setting

import (
	"encoding/json"
	"one-api/common"
	"sync"
)

var userUsableGroups = map[string]string{
	"default":    "默认分组",
	"vip":        "VIP分组",
	"premium":    "高级分组",
	"channel_a":  "渠道分组A",
	"channel_b":  "渠道分组B",
	"channel_c":  "渠道分组C",
}
var userUsableGroupsMutex sync.RWMutex

func GetUserUsableGroupsCopy() map[string]string {
	userUsableGroupsMutex.RLock()
	defer userUsableGroupsMutex.RUnlock()

	copyUserUsableGroups := make(map[string]string)
	for k, v := range userUsableGroups {
		copyUserUsableGroups[k] = v
	}
	return copyUserUsableGroups
}

func UserUsableGroups2JSONString() string {
	userUsableGroupsMutex.RLock()
	defer userUsableGroupsMutex.RUnlock()

	jsonBytes, err := json.Marshal(userUsableGroups)
	if err != nil {
		common.SysLog("error marshalling user groups: " + err.Error())
	}
	return string(jsonBytes)
}

func UpdateUserUsableGroupsByJSONString(jsonStr string) error {
	userUsableGroupsMutex.Lock()
	defer userUsableGroupsMutex.Unlock()

	userUsableGroups = make(map[string]string)
	return json.Unmarshal([]byte(jsonStr), &userUsableGroups)
}

func GetUserUsableGroups(userGroup string) map[string]string {
	// 根据用户组获取可选分组列表
	availableGroups := GetAvailableGroupsForUserGroup(userGroup)
	
	// 构建返回的分组映射
	result := make(map[string]string)
	for _, group := range availableGroups {
		// 从全局用户可用分组中获取描述
		if desc, ok := userUsableGroups[group]; ok {
			result[group] = desc
		} else {
			// 如果没有描述，使用分组名作为描述
			result[group] = group
		}
	}
	
	// 确保至少有default分组
	if _, ok := result["default"]; !ok {
		result["default"] = "默认分组"
	}
	
	return result
}

func GroupInUserUsableGroups(groupName string) bool {
	userUsableGroupsMutex.RLock()
	defer userUsableGroupsMutex.RUnlock()

	_, ok := userUsableGroups[groupName]
	return ok
}

func GetUsableGroupDescription(groupName string) string {
	userUsableGroupsMutex.RLock()
	defer userUsableGroupsMutex.RUnlock()

	if desc, ok := userUsableGroups[groupName]; ok {
		return desc
	}
	return groupName
}
