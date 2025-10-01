package model

import (
	"errors"
	"one-api/common"
	"one-api/logger"
	"time"

	"gorm.io/gorm"
)

// CheckIn 签到记录
type CheckIn struct {
	Id        int       `json:"id"`
	UserId    int       `json:"user_id" gorm:"index"`
	CheckDate string    `json:"check_date" gorm:"index"` // 格式: YYYY-MM-DD
	Reward    int       `json:"reward"`                  // 签到获得的额度
	CreatedAt time.Time `json:"created_at"`
}

// CheckInConfig 签到配置（存储在option表中）
type CheckInConfig struct {
	Enabled           bool   `json:"enabled"`             // 是否启用签到功能
	MinReward         int    `json:"min_reward"`          // 最小签到奖励
	MaxReward         int    `json:"max_reward"`          // 最大签到奖励（0表示固定奖励）
	AuthCodeEnabled   bool   `json:"auth_code_enabled"`   // 是否启用鉴权码
	AuthCode          string `json:"auth_code"`           // 鉴权码
	ContinuousEnabled bool   `json:"continuous_enabled"`  // 是否启用连续签到奖励
	ContinuousReward  int    `json:"continuous_reward"`   // 每连续签到N天增加的奖励
	ContinuousDays    int    `json:"continuous_days"`     // 连续签到天数阈值
}

// GetUserCheckInToday 获取用户今日签到记录
func GetUserCheckInToday(userId int) (*CheckIn, error) {
	today := time.Now().Format("2006-01-02")
	var checkIn CheckIn
	err := DB.Where("user_id = ? AND check_date = ?", userId, today).First(&checkIn).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &checkIn, err
}

// GetUserCheckInHistory 获取用户签到历史（按月）
func GetUserCheckInHistory(userId int, year int, month int) ([]*CheckIn, error) {
	var checkIns []*CheckIn
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.Local)
	endDate := startDate.AddDate(0, 1, 0)
	
	err := DB.Where("user_id = ? AND check_date >= ? AND check_date < ?", 
		userId, 
		startDate.Format("2006-01-02"), 
		endDate.Format("2006-01-02")).
		Order("check_date ASC").
		Find(&checkIns).Error
	
	return checkIns, err
}

// GetUserContinuousCheckInDays 获取用户连续签到天数
func GetUserContinuousCheckInDays(userId int) (int, error) {
	var checkIns []CheckIn
	// 获取最近30天的签到记录
	startDate := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	err := DB.Where("user_id = ? AND check_date >= ?", userId, startDate).
		Order("check_date DESC").
		Find(&checkIns).Error
	
	if err != nil {
		return 0, err
	}
	
	if len(checkIns) == 0 {
		return 0, nil
	}
	
	// 计算连续签到天数
	continuousDays := 0
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	
	// 检查今天或昨天是否签到
	if len(checkIns) > 0 {
		lastCheckDate := checkIns[0].CheckDate
		if lastCheckDate != today && lastCheckDate != yesterday {
			return 0, nil
		}
		
		// 从最近的签到日期开始往前计算
		expectedDate := lastCheckDate
		for _, checkIn := range checkIns {
			if checkIn.CheckDate == expectedDate {
				continuousDays++
				// 计算前一天的日期
				t, _ := time.Parse("2006-01-02", expectedDate)
				expectedDate = t.AddDate(0, 0, -1).Format("2006-01-02")
			} else {
				break
			}
		}
	}
	
	return continuousDays, nil
}

// CreateCheckIn 创建签到记录
func CreateCheckIn(userId int, reward int) error {
	today := time.Now().Format("2006-01-02")
	
	// 检查今天是否已签到
	existing, err := GetUserCheckInToday(userId)
	if err != nil {
		return err
	}
	if existing != nil {
		return errors.New("今日已签到")
	}
	
	checkIn := &CheckIn{
		UserId:    userId,
		CheckDate: today,
		Reward:    reward,
		CreatedAt: time.Now(),
	}
	
	// 开始事务
	tx := DB.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	
	// 创建签到记录
	if err := tx.Create(checkIn).Error; err != nil {
		tx.Rollback()
		return err
	}
	
	// 增加用户额度
	if err := tx.Model(&User{}).Where("id = ?", userId).
		Update("quota", gorm.Expr("quota + ?", reward)).Error; err != nil {
		tx.Rollback()
		return err
	}
	
	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return err
	}
	
	// 记录日志
	RecordLog(userId, LogTypeSystem, "每日签到获得 "+logger.LogQuota(reward))
	
	return nil
}

// GetAllCheckIns 获取所有签到记录（管理员）
func GetAllCheckIns(pageInfo *common.PageInfo) ([]*CheckIn, int64, error) {
	var checkIns []*CheckIn
	var total int64
	
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	
	err := tx.Model(&CheckIn{}).Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}
	
	err = tx.Order("id desc").
		Limit(pageInfo.GetPageSize()).
		Offset(pageInfo.GetStartIdx()).
		Find(&checkIns).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}
	
	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}
	
	return checkIns, total, nil
}

// CheckInLeaderboard 签到排行榜数据结构
type CheckInLeaderboard struct {
	UserId          int    `json:"user_id"`
	Username        string `json:"username"`
	TotalCheckIns   int    `json:"total_checkins"`
	ContinuousDays  int    `json:"continuous_days"`
	TotalRewards    int    `json:"total_rewards"`
	LastCheckInDate string `json:"last_checkin_date"`
	Rank            int    `json:"rank"`
}

// GetCheckInLeaderboard 获取签到排行榜
func GetCheckInLeaderboard(limit int) ([]*CheckInLeaderboard, error) {
	var leaderboard []*CheckInLeaderboard
	
	// 使用原生SQL查询获取排行榜数据
	// 查询每个用户的签到统计信息，按总签到次数排序
	sql := `
		SELECT 
			c.user_id,
			u.username,
			COUNT(c.id) as total_checkins,
			SUM(c.reward) as total_rewards,
			MAX(c.check_date) as last_checkin_date,
			ROW_NUMBER() OVER (ORDER BY COUNT(c.id) DESC) as rank
		FROM check_ins c
		LEFT JOIN users u ON c.user_id = u.id
		GROUP BY c.user_id, u.username
		ORDER BY total_checkins DESC
		LIMIT ?
	`
	
	err := DB.Raw(sql, limit).Scan(&leaderboard).Error
	if err != nil {
		return nil, err
	}
	
	// 为每个用户计算连续签到天数
	for _, item := range leaderboard {
		continuousDays, err := GetUserContinuousCheckInDays(item.UserId)
		if err == nil {
			item.ContinuousDays = continuousDays
		}
	}
	
	return leaderboard, nil
}
