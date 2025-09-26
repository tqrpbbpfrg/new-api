package model

import (
	"errors"
	"math/rand"
	"one-api/common"
	"time"

	"gorm.io/gorm"
)

// LotteryPrize 抽奖奖品配置
// Weight: 权重（相对值，>=0，0 表示不可中）
// Stock: 当前剩余库存，-1 表示无限库存
// TotalStock: 初始库存（统计用）
type LotteryPrize struct {
	Id         int            `json:"id"`
	Name       string         `json:"name" gorm:"type:varchar(64);index"`
	Type       string         `json:"type" gorm:"type:varchar(32);index"` // quota / quota_range / ticket / custom / free_hours / double_hours
	Value      int            `json:"value" gorm:"default:0"`             // quota: 固定额度；ticket: 抽奖券数量；free_hours/double_hours: 小时数；quota_range: 备用/兼容不使用
	RangeMin   int            `json:"range_min" gorm:"default:0"`         // quota_range 最小值（可为负）
	RangeMax   int            `json:"range_max" gorm:"default:0"`         // quota_range 最大值（可为负且可 <0; 若 < RangeMin 视为无效）
	Weight     int            `json:"weight" gorm:"default:0"`
	Stock      int            `json:"stock" gorm:"default:-1"`
	TotalStock int            `json:"total_stock" gorm:"default:-1"`
	Rarity     string         `json:"rarity" gorm:"type:varchar(16);default:'normal'"` // normal/rare/epic/legend
	Status     int            `json:"status" gorm:"default:1"`                         // 1 启用 0 禁用
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index"`
}

type LotteryDrawRecord struct {
	Id        int       `json:"id"`
	UserId    int       `json:"user_id" gorm:"index"`
	PrizeId   int       `json:"prize_id" gorm:"index"`
	PrizeName string    `json:"prize_name" gorm:"type:varchar(64)"`
	PrizeType string    `json:"prize_type" gorm:"type:varchar(16)"`
	Value     int       `json:"value"`
	CreatedAt time.Time `json:"created_at"`
}

// LotteryTicketLog 记录抽奖券增减
// Reason: grant / redeem_code / draw / adjust
type LotteryTicketLog struct {
	Id        int       `json:"id"`
	UserId    int       `json:"user_id" gorm:"index"`
	Delta     int       `json:"delta"`
	Reason    string    `json:"reason" gorm:"type:varchar(32);index"`
	RelatedId int       `json:"related_id" gorm:"index"` // 关联 prize 或 code id
	CreatedAt time.Time `json:"created_at"`
}

// LotteryTicketCode 管理员生成的抽奖券兑换码
type LotteryTicketCode struct {
	Id          int            `json:"id"`
	Code        string         `json:"code" gorm:"type:char(32);uniqueIndex"`
	Tickets     int            `json:"tickets"`
	Status      int            `json:"status" gorm:"default:1"` // 1 可用 2 已用 0 禁用
	CreatedTime int64          `json:"created_time" gorm:"bigint"`
	UsedTime    int64          `json:"used_time" gorm:"bigint"`
	UsedUserId  int            `json:"used_user_id"`
	DeletedAt   gorm.DeletedAt `gorm:"index"`
}

// GetUserTicketCount 汇总用户当前抽奖券数量
func GetUserTicketCount(userId int) (int, error) {
	var total int64
	err := DB.Model(&LotteryTicketLog{}).Where("user_id = ?", userId).Select("COALESCE(SUM(delta),0)").Scan(&total).Error
	return int(total), err
}

// GrantUserTickets 增加用户抽奖券（可为负调整）
func GrantUserTickets(userId, delta int, reason string, relatedId int) error {
	if delta == 0 {
		return nil
	}
	log := &LotteryTicketLog{UserId: userId, Delta: delta, Reason: reason, RelatedId: relatedId, CreatedAt: time.Now()}
	return DB.Create(log).Error
}

// RedeemTicketCode 兑换抽奖券
func RedeemTicketCode(code string, userId int) (int, error) {
	if code == "" {
		return 0, errors.New("未提供兑换码")
	}
	var record LotteryTicketCode
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("code = ? AND status = 1", code).First(&record).Error; err != nil {
			return errors.New("兑换码无效")
		}
		// 再次确保未被并发使用：条件更新
		res := tx.Model(&LotteryTicketCode{}).Where("id=? AND status=1", record.Id).Update("status", 2)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errors.New("兑换码无效")
		}
		record.Status = 2
		record.UsedTime = common.GetTimestamp()
		record.UsedUserId = userId
		if err := tx.Model(&LotteryTicketCode{}).Where("id=?", record.Id).Updates(map[string]interface{}{"used_time": record.UsedTime, "used_user_id": userId}).Error; err != nil {
			return err
		}
		if err := tx.Create(&LotteryTicketLog{UserId: userId, Delta: record.Tickets, Reason: "redeem_code", RelatedId: record.Id, CreatedAt: time.Now()}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return record.Tickets, nil
}

// selectAndConsumePrize 在事务中选择一个奖品并（如果有限库存）原子扣减库存。
// 为降低锁冲突，不使用全表 FOR UPDATE，而是基于乐观更新：选定后对有限库存 prize 执行 stock>0 的 update；
// update 失败（RowsAffected=0）表示被并发消耗，再次尝试重新抽取。
func selectAndConsumePrize(tx *gorm.DB) (*LotteryPrize, error) {
	// 限制重试次数防止极端情况下无限循环
	const maxAttempts = 10
	for attempt := 0; attempt < maxAttempts; attempt++ {
		var prizes []LotteryPrize
		if err := tx.Where("status = 1 AND (stock != 0)").Find(&prizes).Error; err != nil {
			return nil, err
		}
		if len(prizes) == 0 {
			return nil, errors.New("暂无可用奖品")
		}
		totalWeight := 0
		for _, p := range prizes {
			if p.Weight > 0 {
				totalWeight += p.Weight
			}
		}
		if totalWeight == 0 {
			return nil, errors.New("奖品未配置权重")
		}
		r := rand.Intn(totalWeight)
		var chosen *LotteryPrize
		acc := 0
		for i := range prizes {
			if prizes[i].Weight <= 0 {
				continue
			}
			acc += prizes[i].Weight
			if r < acc {
				chosen = &prizes[i]
				break
			}
		}
		if chosen == nil {
			continue
		}
		// 无限库存直接返回
		if chosen.Stock < 0 {
			return chosen, nil
		}
		// 有限库存尝试原子扣减
		res := tx.Model(&LotteryPrize{}).Where("id = ? AND stock > 0", chosen.Id).UpdateColumn("stock", gorm.Expr("stock - 1"))
		if res.Error != nil {
			return nil, res.Error
		}
		if res.RowsAffected == 0 {
			// 被并发抢走了，重试
			continue
		}
		// 成功扣减，本地结构同步减 1（便于后续逻辑使用）
		chosen.Stock -= 1
		return chosen, nil
	}
	return nil, errors.New("库存不足，请重试")
}

// DrawOnce 外部单次抽奖（扣券 + 发奖）
func DrawOnce(userId int, cost int) (*LotteryDrawRecord, error) {
	if cost <= 0 {
		cost = common.LotteryCostPerDraw
	}
	tickets, err := GetUserTicketCount(userId)
	if err != nil {
		return nil, err
	}
	if tickets < cost {
		return nil, errors.New("抽奖券不足")
	}
	var rec *LotteryDrawRecord
	err = DB.Transaction(func(tx *gorm.DB) error {
		// 扣券
		if err := tx.Create(&LotteryTicketLog{UserId: userId, Delta: -cost, Reason: "draw", CreatedAt: time.Now()}).Error; err != nil {
			return err
		}
		prize, e := selectAndConsumePrize(tx)
		if e != nil {
			return e
		}
		appliedValue := prize.Value
		// Handle new prize types
		switch prize.Type {
		case "quota":
			if appliedValue != 0 {
				if e := tx.Model(&User{}).Where("id=?", userId).UpdateColumn("quota", gorm.Expr("quota + ?", appliedValue)).Error; e != nil {
					return e
				}
			}
		case "quota_range":
			// random in [RangeMin, RangeMax]
			delta := randomRange(prize.RangeMin, prize.RangeMax)
			appliedValue = delta
			if delta != 0 {
				if e := tx.Model(&User{}).Where("id=?", userId).UpdateColumn("quota", gorm.Expr("quota + ?", delta)).Error; e != nil {
					return e
				}
			}
		case "ticket":
			if prize.Value != 0 {
				if e := tx.Create(&LotteryTicketLog{UserId: userId, Delta: prize.Value, Reason: "prize", RelatedId: prize.Id, CreatedAt: time.Now()}).Error; e != nil {
					return e
				}
			}
		case "free_hours":
			hours := prize.Value
			if hours <= 0 {
				hours = 1
			}
			extendFreeQuotaWindow(tx, userId, hours)
		case "double_hours":
			hours := prize.Value
			if hours <= 0 {
				hours = 1
			}
			extendDoubleCostWindow(tx, userId, hours)
		}
		rec = &LotteryDrawRecord{UserId: userId, PrizeId: prize.Id, PrizeName: prize.Name, PrizeType: prize.Type, Value: appliedValue, CreatedAt: time.Now()}
		if e := tx.Create(rec).Error; e != nil {
			return e
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return rec, nil
}

// DrawMultiple 批量抽奖：一次性扣除 totalCost，再执行 times 次 internalDraw 发奖
func DrawMultiple(userId int, times int, costPer int) ([]*LotteryDrawRecord, error) {
	if times <= 0 || times > 50 {
		return nil, errors.New("无效的次数")
	}
	if costPer <= 0 {
		costPer = common.LotteryCostPerDraw
	}
	totalCost := times * costPer
	tickets, err := GetUserTicketCount(userId)
	if err != nil {
		return nil, err
	}
	if tickets < totalCost {
		return nil, errors.New("抽奖券不足")
	}
	results := make([]*LotteryDrawRecord, 0, times)
	err = DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&LotteryTicketLog{UserId: userId, Delta: -totalCost, Reason: "draw_multi", CreatedAt: time.Now()}).Error; err != nil {
			return err
		}
		for i := 0; i < times; i++ {
			prize, e := selectAndConsumePrize(tx)
			if e != nil {
				return e
			}
			appliedValue := prize.Value
			switch prize.Type {
			case "quota":
				if appliedValue != 0 {
					if e := tx.Model(&User{}).Where("id=?", userId).UpdateColumn("quota", gorm.Expr("quota + ?", appliedValue)).Error; e != nil {
						return e
					}
				}
			case "quota_range":
				delta := randomRange(prize.RangeMin, prize.RangeMax)
				appliedValue = delta
				if delta != 0 {
					if e := tx.Model(&User{}).Where("id=?", userId).UpdateColumn("quota", gorm.Expr("quota + ?", delta)).Error; e != nil {
						return e
					}
				}
			case "ticket":
				if prize.Value != 0 {
					if e := tx.Create(&LotteryTicketLog{UserId: userId, Delta: prize.Value, Reason: "prize", RelatedId: prize.Id, CreatedAt: time.Now()}).Error; e != nil {
						return e
					}
				}
			case "free_hours":
				hours := prize.Value
				if hours <= 0 {
					hours = 1
				}
				extendFreeQuotaWindow(tx, userId, hours)
			case "double_hours":
				hours := prize.Value
				if hours <= 0 {
					hours = 1
				}
				extendDoubleCostWindow(tx, userId, hours)
			}
			rec := &LotteryDrawRecord{UserId: userId, PrizeId: prize.Id, PrizeName: prize.Name, PrizeType: prize.Type, Value: appliedValue, CreatedAt: time.Now()}
			if e := tx.Create(rec).Error; e != nil {
				return e
			}
			results = append(results, rec)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return results, nil
}

// randomRange returns a random integer in [min, max]; if invalid (max < min) returns min.
func randomRange(min, max int) int {
	if max < min {
		return min
	}
	if min == max {
		return min
	}
	d := max - min + 1
	return rand.Intn(d) + min
}

// extendFreeQuotaWindow extends or sets user's FreeQuotaUntil
func extendFreeQuotaWindow(tx *gorm.DB, userId int, hours int) error {
	add := int64(hours) * 3600
	now := time.Now().Unix()
	return tx.Model(&User{}).Where("id = ?", userId).Updates(map[string]interface{}{
		"free_quota_until": gorm.Expr("CASE WHEN free_quota_until > ? THEN free_quota_until + ? ELSE ? END", now, add, now+add),
	}).Error
}

// extendDoubleCostWindow extends or sets user's DoubleCostUntil
func extendDoubleCostWindow(tx *gorm.DB, userId int, hours int) error {
	add := int64(hours) * 3600
	now := time.Now().Unix()
	return tx.Model(&User{}).Where("id = ?", userId).Updates(map[string]interface{}{
		"double_cost_until": gorm.Expr("CASE WHEN double_cost_until > ? THEN double_cost_until + ? ELSE ? END", now, add, now+add),
	}).Error
}
