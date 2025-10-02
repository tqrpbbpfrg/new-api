package model

import (
	"errors"
	"fmt"
	"one-api/common"
	"one-api/logger"
	"strconv"

	"gorm.io/gorm"
)

type Redemption struct {
	Id             int            `json:"id"`
	UserId         int            `json:"user_id"`
	Key            string         `json:"key" gorm:"type:char(32);uniqueIndex"`
	Status         int            `json:"status" gorm:"default:1"`
	Name           string         `json:"name" gorm:"index"`
	Quota          int            `json:"quota" gorm:"default:100"`
	CreatedTime    int64          `json:"created_time" gorm:"bigint"`
	RedeemedTime   int64          `json:"redeemed_time" gorm:"bigint"`
	Count          int            `json:"count" gorm:"-:all"` // only for api request
	UsedUserId     int            `json:"used_user_id"`
	DeletedAt      gorm.DeletedAt `gorm:"index"`
	ExpiredTime    int64          `json:"expired_time" gorm:"bigint"`         // 过期时间，0 表示不过期
	Type           int            `json:"type" gorm:"default:1"`              // 1: 兑换码（单人单次）, 2: 礼品码（多人使用）
	MaxUses        int            `json:"max_uses" gorm:"default:1"`          // 最大使用人数（礼品码用）
	MaxUsesPerUser int            `json:"max_uses_per_user" gorm:"default:1"` // 每人最大使用次数（礼品码用）
	UsedCount      int            `json:"used_count" gorm:"default:0"`        // 已使用次数（礼品码用）
	UsedUserCount  int            `json:"used_user_count" gorm:"default:0"`   // 已使用该码的用户数量（礼品码用）
}

func GetAllRedemptions(startIdx int, num int) (redemptions []*Redemption, total int64, err error) {
	// 开始事务
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 获取总数
	err = tx.Model(&Redemption{}).Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	// 获取分页数据
	err = tx.Order("id desc").Limit(num).Offset(startIdx).Find(&redemptions).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	// 提交事务
	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return redemptions, total, nil
}

// GetRedemptionsGroupedByName 按名称分组获取兑换码
func GetRedemptionsGroupedByName(startIdx int, num int) (groups []map[string]interface{}, total int64, err error) {
	// 开始事务
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 获取所有不重复的名称
	var names []string
	err = tx.Model(&Redemption{}).Select("DISTINCT name").Where("name != ''").Order("name ASC").Find(&names).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	total = int64(len(names))

	// 分页处理名称
	start := startIdx
	end := startIdx + num
	if start > len(names) {
		start = len(names)
	}
	if end > len(names) {
		end = len(names)
	}

	pagedNames := names[start:end]

	// 为每个名称获取对应的兑换码
	for _, name := range pagedNames {
		var redemptions []*Redemption
		err = tx.Where("name = ?", name).Order("id desc").Find(&redemptions).Error
		if err != nil {
			tx.Rollback()
			return nil, 0, err
		}

		group := map[string]interface{}{
			"name":        name,
			"redemptions": redemptions,
			"count":       len(redemptions),
		}
		groups = append(groups, group)
	}

	// 提交事务
	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return groups, total, nil
}

// DeleteRedemptionsByName 按名称删除兑换码
func DeleteRedemptionsByName(name string) (int64, error) {
	if name == "" {
		return 0, errors.New("名称不能为空")
	}

	result := DB.Where("name = ?", name).Delete(&Redemption{})
	return result.RowsAffected, result.Error
}

func SearchRedemptions(keyword string, startIdx int, num int) (redemptions []*Redemption, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Build query based on keyword type
	query := tx.Model(&Redemption{})

	// Only try to convert to ID if the string represents a valid integer
	if id, err := strconv.Atoi(keyword); err == nil {
		query = query.Where("id = ? OR name LIKE ?", id, keyword+"%")
	} else {
		query = query.Where("name LIKE ?", keyword+"%")
	}

	// Get total count
	err = query.Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	// Get paginated data
	err = query.Order("id desc").Limit(num).Offset(startIdx).Find(&redemptions).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return redemptions, total, nil
}

func GetRedemptionById(id int) (*Redemption, error) {
	if id == 0 {
		return nil, errors.New("id 为空！")
	}
	redemption := Redemption{Id: id}
	var err error = nil
	err = DB.First(&redemption, "id = ?", id).Error
	return &redemption, err
}

func Redeem(key string, userId int) (quota int, err error) {
	if key == "" {
		return 0, errors.New("未提供兑换码")
	}
	if userId == 0 {
		return 0, errors.New("无效的 user id")
	}
	redemption := &Redemption{}

	keyCol := "`key`"
	if common.UsingPostgreSQL {
		keyCol = `"key"`
	}
	common.RandomSleep()
	err = DB.Transaction(func(tx *gorm.DB) error {
		err := tx.Set("gorm:query_option", "FOR UPDATE").Where(keyCol+" = ?", key).First(redemption).Error
		if err != nil {
			return errors.New("无效的兑换码")
		}
		// 状态预检：普通兑换码直接要求必须为启用；礼品码允许根据 used_user_count 与 max_uses 再判定
		if redemption.Type == common.RedemptionTypeNormal {
			if redemption.Status != common.RedemptionCodeStatusEnabled {
				// 普通兑换码任何非启用状态都视为已使用或不可用
				return errors.New("该兑换码已被使用")
			}
		} else if redemption.Type == common.RedemptionTypeGift {
			// 对礼品码：
			//  1. 如果被禁用直接报错
			//  2. 如果已达到最大使用人数，提示达到最大使用人数
			//  3. 否则允许继续使用（保持启用状态直到达到最大使用人数）
			if redemption.Status == common.RedemptionCodeStatusDisabled {
				return errors.New("该礼品码已被禁用")
			}
			if redemption.MaxUses > 0 && redemption.UsedUserCount >= redemption.MaxUses {
				return errors.New("该礼品码已达到最大使用人数")
			}
		} else {
			return errors.New("未知的兑换码类型")
		}
		if redemption.ExpiredTime != 0 && redemption.ExpiredTime < common.GetTimestamp() {
			return errors.New("该兑换码已过期")
		}

		// 检查兑换码类型
		if redemption.Type == common.RedemptionTypeNormal {
			// 普通兑换码：单人单次使用
			err = tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", redemption.Quota)).Error
			if err != nil {
				return err
			}
			redemption.RedeemedTime = common.GetTimestamp()
			redemption.Status = common.RedemptionCodeStatusUsed
			redemption.UsedUserId = userId
		} else if redemption.Type == common.RedemptionTypeGift {
			// 礼品码：多人使用，需要检查使用限制

			// 检查每人使用次数限制
			if redemption.MaxUsesPerUser > 0 {
				// 查询该用户对此礼品码的总使用次数
				var userUsedCount int64
				err = tx.Model(&Log{}).Where("user_id = ? AND type = ? AND content LIKE ?", userId, LogTypeTopup, fmt.Sprintf("%%礼品码ID %d%%", redemption.Id)).Count(&userUsedCount).Error
				if err != nil {
					return err
				}
				if int(userUsedCount) >= redemption.MaxUsesPerUser {
					return errors.New("您已达到此礼品码的最大使用次数")
				}
			}

			// 检查该用户是否是第一次使用此礼品码
			var firstTimeUser bool
			var userUsageCount int64
			err = tx.Model(&Log{}).Where("user_id = ? AND type = ? AND content LIKE ?", userId, LogTypeTopup, fmt.Sprintf("%%礼品码ID %d%%", redemption.Id)).Count(&userUsageCount).Error
			if err != nil {
				return err
			}
			firstTimeUser = (userUsageCount == 0)

			// 检查是否超过最大使用人数
			if redemption.MaxUses > 0 && redemption.UsedUserCount >= redemption.MaxUses && firstTimeUser {
				return errors.New("该礼品码已达到最大使用人数")
			}

			// 增加用户额度
			err = tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", redemption.Quota)).Error
			if err != nil {
				return err
			}

			// 更新礼品码使用信息
			redemption.UsedCount++
			redemption.RedeemedTime = common.GetTimestamp()
			
			// 如果是第一次使用此礼品码的用户，增加使用用户数
			if firstTimeUser {
				redemption.UsedUserCount++
			}

			// 如果达到最大使用人数，标记为已使用；否则保持启用状态
			if redemption.MaxUses > 0 && redemption.UsedUserCount >= redemption.MaxUses {
				redemption.Status = common.RedemptionCodeStatusUsed
			} else {
				// 确保礼品码在未达到最大使用人数时保持启用状态
				redemption.Status = common.RedemptionCodeStatusEnabled
			}
		} else { // 已在前面类型预检处理未知类型，这里理论上不会走到
			return errors.New("未知的兑换码类型")
		}

		err = tx.Save(redemption).Error
		return err
	})
	if err != nil {
		return 0, errors.New("兑换失败，" + err.Error())
	}

	// 记录日志
	var logType string
	if redemption.Type == common.RedemptionTypeNormal {
		logType = "兑换码"
	} else {
		logType = "礼品码"
	}
	RecordLog(userId, LogTypeTopup, fmt.Sprintf("通过%s充值 %s，%sID %d", logType, logger.LogQuota(redemption.Quota), logType, redemption.Id))
	return redemption.Quota, nil
}

func (redemption *Redemption) Insert() error {
	var err error
	err = DB.Create(redemption).Error
	return err
}

func (redemption *Redemption) SelectUpdate() error {
	// This can update zero values
	return DB.Model(redemption).Select("redeemed_time", "status").Updates(redemption).Error
}

// Update Make sure your token's fields is completed, because this will update non-zero values
func (redemption *Redemption) Update() error {
	var err error
	err = DB.Model(redemption).Select("name", "status", "quota", "redeemed_time", "expired_time", "type", "max_uses", "max_uses_per_user", "used_count", "used_user_count").Updates(redemption).Error
	return err
}

func (redemption *Redemption) Delete() error {
	var err error
	err = DB.Delete(redemption).Error
	return err
}

func DeleteRedemptionById(id int) (err error) {
	if id == 0 {
		return errors.New("id 为空！")
	}
	redemption := Redemption{Id: id}
	err = DB.Where(redemption).First(&redemption).Error
	if err != nil {
		return err
	}
	return redemption.Delete()
}

func DeleteInvalidRedemptions() (int64, error) {
	now := common.GetTimestamp()
	result := DB.Where("status IN ? OR (status = ? AND expired_time != 0 AND expired_time < ?)", []int{common.RedemptionCodeStatusUsed, common.RedemptionCodeStatusDisabled}, common.RedemptionCodeStatusEnabled, now).Delete(&Redemption{})
	return result.RowsAffected, result.Error
}
