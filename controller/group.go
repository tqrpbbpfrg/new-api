package controller

import (
	"net/http"
	"one-api/model"
	"one-api/setting"
	"one-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
)

func GetGroups(c *gin.Context) {
	groupNames := make([]string, 0)
	for groupName := range ratio_setting.GetGroupRatioCopy() {
		groupNames = append(groupNames, groupName)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    groupNames,
	})
}

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
