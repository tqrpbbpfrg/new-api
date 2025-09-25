package model

import (
	"errors"
	"fmt"
	"one-api/common"
	"time"

	"gorm.io/gorm"
)

// Checkin 记录每日签到
type Checkin struct {
	ID        int       `json:"id" gorm:"primaryKey"`
	UserID    int       `json:"user_id" gorm:"index;not null;column:user_id"`
	Date      string    `json:"date" gorm:"type:char(10);uniqueIndex:idx_user_date;not null"` // YYYY-MM-DD
	Reward    int       `json:"reward" gorm:"type:int;not null"`
	Streak    int       `json:"streak" gorm:"type:int;not null"` // 连续天数
	CreatedAt time.Time `json:"created_at"`
}

func (c *Checkin) TableName() string { return "checkins" }

// CreateToday 如果当天已经存在返回已存在的记录
func CreateToday(userID int, reward int, streak int) (*Checkin, error) {
	today := time.Now().Format("2006-01-02")
	ck := &Checkin{}
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND date = ?", userID, today).First(ck).Error; err == nil && ck.ID != 0 {
			return nil
		}
		ck = &Checkin{UserID: userID, Date: today, Reward: reward, Streak: streak}
		if err := tx.Create(ck).Error; err != nil {
			return err
		}
		return nil
	})
	return ck, err
}

func GetToday(userID int) (*Checkin, bool, error) {
	today := time.Now().Format("2006-01-02")
	ck := &Checkin{}
	err := DB.Where("user_id = ? AND date = ?", userID, today).First(ck).Error
	if err != nil {
		return nil, false, nil
	}
	if ck.ID == 0 {
		return nil, false, nil
	}
	return ck, true, nil
}

func GetLatest(userID int) (*Checkin, error) {
	ck := &Checkin{}
	err := DB.Where("user_id = ?", userID).Order("date desc").First(ck).Error
	if err != nil {
		return nil, err
	}
	return ck, nil
}

// GetBestStreak 返回历史最佳连续签到天数
func GetBestStreak(userID int) (int, error) {
	var best int
	// MAX(streak) 若无记录 Scan 返回 zero 值无需特殊处理
	err := DB.Model(&Checkin{}).Where("user_id = ?", userID).Select("MAX(streak)").Scan(&best).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) { // MAX 不会返回 ErrRecordNotFound，但稳妥处理
		return 0, err
	}
	return best, nil
}

func GetMonth(userID int, month string) ([]Checkin, error) { // month format YYYY-MM
	var list []Checkin
	like := month + "%"
	err := DB.Where("user_id = ? AND date LIKE ?", userID, like).Order("date asc").Find(&list).Error
	return list, err
}

// CalcStreak 计算新的连续天数
func CalcStreak(latest *Checkin) int {
	if latest == nil {
		return 1
	}
	yesterday := time.Now().Add(-24 * time.Hour).Format("2006-01-02")
	if latest.Date == yesterday {
		return latest.Streak + 1
	}
	return 1
}

// RandomReward 返回区间随机值
func RandomReward(streak int) int {
	min := common.CheckinMinReward
	max := common.CheckinMaxReward
	if max < min {
		max = min
	}
	base := min + int(time.Now().UnixNano()%int64(max-min+1))
	// streak bonus
	bonusPercent := 0
	for threshold, percent := range common.CheckinStreakBonus {
		if streak >= threshold && percent > bonusPercent {
			bonusPercent = percent
		}
	}
	if bonusPercent > 0 {
		base = base + base*bonusPercent/100
	}
	return base
}

// ValidateMonth 格式校验
func ValidateMonth(month string) error {
	if len(month) != 7 || month[4] != '-' {
		return errors.New("invalid month format, expect YYYY-MM")
	}
	return nil
}

// MonthRangeDays 返回月天数
func MonthRangeDays(month string) int {
	t, _ := time.Parse("2006-01", month)
	firstOfNext := t.AddDate(0, 1, 0)
	return int(firstOfNext.Sub(t).Hours() / 24)
}

func FormatReward(q int) string { return fmt.Sprintf("%d", q) }
