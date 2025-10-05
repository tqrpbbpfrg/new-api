package controller

import (
	"fmt"
	"net/http"
	"one-api/common"
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
	
	// 获取用户的额外分组
	extraGroups := user.GetExtraGroups()
	
	// 调试日志
	common.SysLog(fmt.Sprintf("[GetUserGroups] User %d (%s) - Main Group: %s, Extra Groups: %v",
		userId, user.Username, user.Group, extraGroups))
	
	// 收集用户可选分组：主分组的可选分组 + 额外分组本身
	availableGroupsSet := make(map[string]bool)
	
	// 1. 添加主分组的可选分组
	mainGroupUsableGroups := setting.GetUserUsableGroups(user.Group)
	common.SysLog(fmt.Sprintf("[GetUserGroups] User %d - Main Group '%s' has usable groups: %v",
		userId, user.Group, mainGroupUsableGroups))
	
	// 如果主分组的可选分组为空或只有default，确保至少包含用户的主分组本身
	if len(mainGroupUsableGroups) == 0 || (len(mainGroupUsableGroups) == 1 && mainGroupUsableGroups["default"] != "") {
		common.SysLog(fmt.Sprintf("[GetUserGroups] User %d - No available groups configured for main group '%s', adding main group itself",
			userId, user.Group))
		// 添加用户的主分组本身
		availableGroupsSet[user.Group] = true
	}
	
	for groupName := range mainGroupUsableGroups {
		availableGroupsSet[groupName] = true
	}
	
	// 2. 添加额外分组本身（不是额外分组的可选分组）
	for _, extraGroup := range extraGroups {
		availableGroupsSet[extraGroup] = true
	}
	common.SysLog(fmt.Sprintf("[GetUserGroups] User %d - Added extra groups to available set: %v",
		userId, extraGroups))
	
	// 调试日志
	common.SysLog(fmt.Sprintf("[GetUserGroups] User %d - Final available groups set: %v",
		userId, availableGroupsSet))
	
	// 构建返回数据
	groupRatios := ratio_setting.GetGroupRatioCopy()
	common.SysLog(fmt.Sprintf("[GetUserGroups] User %d - Group ratios: %v", userId, groupRatios))
	
	for groupName := range availableGroupsSet {
		// 先尝试从主分组的可选分组中获取描述
		desc := ""
		if d, ok := mainGroupUsableGroups[groupName]; ok {
			desc = d
		} else {
			// 如果不在主分组的可选分组中，使用全局描述
			desc = setting.GetUsableGroupDescription(groupName)
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
	
	// 调试日志
	common.SysLog(fmt.Sprintf("[GetUserGroups] User %d - Final usable groups: %v", userId, usableGroups))
	
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
