package controller

import (
	"net/http"
	"one-api/common"
	"one-api/model"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
)

type CheckinResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

func ok(data interface{}) CheckinResponse { return CheckinResponse{Code: 0, Message: "ok", Data: data} }
func fail(msg string) CheckinResponse     { return CheckinResponse{Code: 1, Message: msg} }

// POST /api/checkin  今日签到
func PostCheckin(c *gin.Context) {
	// 全局开关
	common.OptionMapRWMutex.RLock()
	enabled := common.CheckinEnabled
	common.OptionMapRWMutex.RUnlock()
	if !enabled {
		c.JSON(http.StatusOK, fail("签到功能未开启"))
		return
	}
	userId := c.GetInt("id")
	// 是否已签到
	if today, exist, _ := model.GetToday(userId); exist {
		c.JSON(http.StatusOK, ok(gin.H{"already": true, "record": today}))
		return
	}
	latest, _ := model.GetLatest(userId)
	streak := model.CalcStreak(latest)
	reward := model.RandomReward(streak)
	ck, err := model.CreateToday(userId, reward, streak)
	if err != nil {
		c.JSON(http.StatusInternalServerError, fail(err.Error()))
		return
	}
	// 增加用户额度
	_ = model.IncreaseUserQuota(userId, reward, false)
	c.JSON(http.StatusOK, ok(ck))
}

// GET /api/checkin/status 今日状态
func GetCheckinStatus(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	enabled := common.CheckinEnabled
	common.OptionMapRWMutex.RUnlock()
	if !enabled {
		c.JSON(http.StatusOK, fail("签到功能未开启"))
		return
	}
	userId := c.GetInt("id")
	today, exist, _ := model.GetToday(userId)
	latest, _ := model.GetLatest(userId)
	streak := 0
	if latest != nil {
		streak = latest.Streak
	}
	month := time.Now().Format("2006-01")
	monthList, _ := model.GetMonth(userId, month)
	totalDays := len(monthList)
	monthSum := 0
	for _, r := range monthList {
		monthSum += r.Reward
	}
	// 历史最佳 streak
	bestStreak, _ := model.GetBestStreak(userId)
	// 有序 streak bonus 列表 [{threshold, percent}, ...]
	ordered := make([]gin.H, 0, len(common.CheckinStreakBonus))
	keys := make([]int, 0, len(common.CheckinStreakBonus))
	for k := range common.CheckinStreakBonus { keys = append(keys, k) }
	sort.Ints(keys)
	for _, k := range keys { ordered = append(ordered, gin.H{"threshold": k, "percent": common.CheckinStreakBonus[k]}) }
	c.JSON(http.StatusOK, ok(gin.H{
		"today_checked":       exist,
		"today":               today,
		"streak":              streak,
		"best_streak":         bestStreak,
		"reward_min":          common.CheckinMinReward,
		"reward_max":          common.CheckinMaxReward,
		"month_checked_days":  totalDays,
		"month_reward_sum":    monthSum,
		"config":              gin.H{"streak_bonus": common.CheckinStreakBonus, "streak_bonus_list": ordered},
	}))
}

// GET /api/checkin/calendar?month=YYYY-MM  月数据
func GetCheckinCalendar(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	enabled := common.CheckinEnabled
	common.OptionMapRWMutex.RUnlock()
	if !enabled {
		c.JSON(http.StatusOK, fail("签到功能未开启"))
		return
	}
	userId := c.GetInt("id")
	month := c.Query("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	if err := model.ValidateMonth(month); err != nil {
		c.JSON(http.StatusBadRequest, fail(err.Error()))
		return
	}
	list, err := model.GetMonth(userId, month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, fail(err.Error()))
		return
	}
	// 建立 map 方便前端渲染
	c.JSON(http.StatusOK, ok(gin.H{"month": month, "records": list}))
}
