package controller

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"one-api/common"
	"one-api/model"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetCheckInConfig 获取签到配置
func GetCheckInConfig(c *gin.Context) {
	configStr := model.OptionMap["CheckInConfig"]
	if configStr == "" {
		// 返回默认配置
		defaultConfig := model.CheckInConfig{
			Enabled:           false,
			MinReward:         100,
			MaxReward:         0,
			AuthCodeEnabled:   false,
			AuthCode:          "",
			ContinuousEnabled: false,
			ContinuousReward:  50,
			ContinuousDays:    7,
		}
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    defaultConfig,
		})
		return
	}

	var config model.CheckInConfig
	err := json.Unmarshal([]byte(configStr), &config)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "配置解析失败",
		})
		return
	}

	// 不返回鉴权码给前端
	config.AuthCode = ""

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    config,
	})
}

// UpdateCheckInConfig 更新签到配置（管理员）
func UpdateCheckInConfig(c *gin.Context) {
	var config model.CheckInConfig
	err := c.ShouldBindJSON(&config)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}

	// 验证配置
	if config.MinReward < 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "最小奖励不能为负数",
		})
		return
	}

	if config.MaxReward < 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "最大奖励不能为负数",
		})
		return
	}

	if config.MaxReward > 0 && config.MaxReward < config.MinReward {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "最大奖励不能小于最小奖励",
		})
		return
	}

	configBytes, err := json.Marshal(config)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "配置序列化失败",
		})
		return
	}

	err = model.UpdateOption("CheckInConfig", string(configBytes))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "配置保存失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "配置更新成功",
	})
}

// GetUserCheckInStatus 获取用户签到状态
func GetUserCheckInStatus(c *gin.Context) {
	userId := c.GetInt("id")

	// 获取今日签到记录
	todayCheckIn, err := model.GetUserCheckInToday(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取签到状态失败",
		})
		return
	}

	// 获取连续签到天数
	continuousDays, err := model.GetUserContinuousCheckInDays(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取连续签到天数失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":         true,
		"checked_in":      todayCheckIn != nil,
		"continuous_days": continuousDays,
		"today_reward":    func() int {
			if todayCheckIn != nil {
				return todayCheckIn.Reward
			}
			return 0
		}(),
	})
}

// GetUserCheckInHistory 获取用户签到历史
func GetUserCheckInHistory(c *gin.Context) {
	userId := c.GetInt("id")

	yearStr := c.Query("year")
	monthStr := c.Query("month")

	year, err := strconv.Atoi(yearStr)
	if err != nil || year < 2020 || year > 2100 {
		year = time.Now().Year()
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		month = int(time.Now().Month())
	}

	checkIns, err := model.GetUserCheckInHistory(userId, year, month)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取签到历史失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    checkIns,
	})
}

// CheckIn 用户签到
func CheckIn(c *gin.Context) {
	userId := c.GetInt("id")

	// 获取签到配置
	configStr := model.OptionMap["CheckInConfig"]
	if configStr == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "签到功能未配置",
		})
		return
	}

	var config model.CheckInConfig
	err := json.Unmarshal([]byte(configStr), &config)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "配置解析失败",
		})
		return
	}

	// 检查签到功能是否启用
	if !config.Enabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "签到功能未启用",
		})
		return
	}

	// 检查鉴权码
	if config.AuthCodeEnabled {
		var req struct {
			AuthCode string `json:"auth_code"`
		}
		err := c.ShouldBindJSON(&req)
		if err != nil || req.AuthCode != config.AuthCode {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "鉴权码错误",
			})
			return
		}
	}

	// 检查今天是否已签到
	todayCheckIn, err := model.GetUserCheckInToday(userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "检查签到状态失败",
		})
		return
	}

	if todayCheckIn != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "今日已签到",
		})
		return
	}

	// 计算奖励
	reward := config.MinReward
	if config.MaxReward > 0 && config.MaxReward > config.MinReward {
		// 随机奖励
		reward = config.MinReward + rand.Intn(config.MaxReward-config.MinReward+1)
	}

	// 计算连续签到奖励
	if config.ContinuousEnabled && config.ContinuousReward > 0 && config.ContinuousDays > 0 {
		continuousDays, err := model.GetUserContinuousCheckInDays(userId)
		if err == nil && continuousDays > 0 {
			// 每连续签到N天增加奖励
			bonusTimes := continuousDays / config.ContinuousDays
			if bonusTimes > 0 {
				reward += bonusTimes * config.ContinuousReward
			}
		}
	}

	// 创建签到记录
	err = model.CreateCheckIn(userId, reward)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	// 获取更新后的连续签到天数
	continuousDays, _ := model.GetUserContinuousCheckInDays(userId)

	c.JSON(http.StatusOK, gin.H{
		"success":         true,
		"message":         "签到成功",
		"reward":          reward,
		"continuous_days": continuousDays,
	})
}

// GetAllCheckIns 获取所有签到记录（管理员）
func GetAllCheckIns(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	pageSize, _ := strconv.Atoi(c.Query("page_size"))

	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 10
	}

	pageInfo := &common.PageInfo{
		Page:     page,
		PageSize: pageSize,
	}

	checkIns, total, err := model.GetAllCheckIns(pageInfo)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "获取签到记录失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    checkIns,
		"total":   total,
	})
}
