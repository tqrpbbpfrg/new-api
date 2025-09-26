package model

import (
	"errors"
	"fmt"
	"one-api/common"
	"one-api/logger"
	"strconv"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Redemption struct {
	Id           int            `json:"id"`
	UserId       int            `json:"user_id"`
	Key          string         `json:"key" gorm:"type:char(32);uniqueIndex"`
	Status       int            `json:"status" gorm:"default:1"`
	Name         string         `json:"name" gorm:"index"`
	Type         string         `json:"type" gorm:"type:varchar(16);index;default:'code'"` // code 普通兑换码 / gift 礼品码
	MaxUse       int            `json:"max_use" gorm:"default:1"`                          // 礼品码最大使用次数（仅 gift 类型有效）
	UsedCount    int            `json:"used_count" gorm:"default:0"`                       // 已使用次数（仅 gift 类型有效）
	Quota        int            `json:"quota" gorm:"default:100"`
	CreatedTime  int64          `json:"created_time" gorm:"bigint"`
	RedeemedTime int64          `json:"redeemed_time" gorm:"bigint"`
	Count        int            `json:"count" gorm:"-:all"` // only for api request
	UsedUserId   int            `json:"used_user_id"`
	DeletedAt    gorm.DeletedAt `gorm:"index"`
	ExpiredTime  int64          `json:"expired_time" gorm:"bigint"` // 过期时间，0 表示不过期
}

// RedemptionUsage 记录礼品码（gift）被哪个用户使用过，用于防止重复使用
type RedemptionUsage struct {
	Id           int   `json:"id"`
	RedemptionId int   `json:"redemption_id" gorm:"index;uniqueIndex:idx_redemption_user"`
	UserId       int   `json:"user_id" gorm:"index;uniqueIndex:idx_redemption_user"`
	CreatedTime  int64 `json:"created_time" gorm:"bigint"`
}

func (ru *RedemptionUsage) Insert() error {
	return DB.Create(ru).Error
}

func GetAllRedemptions(startIdx int, num int, codeType string) (redemptions []*Redemption, total int64, err error) {
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

	base := tx.Model(&Redemption{})
	if codeType == "code" || codeType == "gift" { // 仅允许两种有效类型过滤
		base = base.Where("type = ?", codeType)
	}
	// 获取总数
	err = base.Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	// 获取分页数据
	err = base.Order("id desc").Limit(num).Offset(startIdx).Find(&redemptions).Error
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

func SearchRedemptions(keyword string, startIdx int, num int, codeType string) (redemptions []*Redemption, total int64, err error) {
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
	if codeType == "code" || codeType == "gift" {
		query = query.Where("type = ?", codeType)
	}

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
	err := DB.First(&redemption, "id = ?", id).Error
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
		// 使用标准锁语法（兼容不同驱动）
		if e := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(keyCol+" = ?", key).First(redemption).Error; e != nil {
			return errors.New("无效的兑换码")
		}
		// 防御性：修正异常 MaxUse 值（历史脏数据）
		if redemption.Type == "gift" && redemption.MaxUse == 0 {
			redemption.MaxUse = 1
		}
		if redemption.Status != common.RedemptionCodeStatusEnabled {
			return errors.New("该兑换码已被使用")
		}
		if redemption.ExpiredTime != 0 && redemption.ExpiredTime < common.GetTimestamp() {
			return errors.New("该兑换码已过期")
		}

		// 普通兑换码：一次性
		if redemption.Type == "code" {
			if e := tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", redemption.Quota)).Error; e != nil {
				return e
			}
			redemption.RedeemedTime = common.GetTimestamp()
			redemption.Status = common.RedemptionCodeStatusUsed
			redemption.UsedUserId = userId
			return tx.Save(redemption).Error
		}

		// 礼品码：可多次使用（同一用户仅一次）; MaxUse = -1 表示无限制
		if redemption.Type == "gift" {
			if redemption.MaxUse != -1 && redemption.MaxUse < 1 { // 极端防御
				redemption.MaxUse = 1
			}
			if redemption.MaxUse != -1 && redemption.UsedCount >= redemption.MaxUse {
				return errors.New("该礼品码已被使用完")
			}
			// 检查该用户是否已经使用过
			var usageCount int64
			if e := tx.Model(&RedemptionUsage{}).Where("redemption_id = ? AND user_id = ?", redemption.Id, userId).Count(&usageCount).Error; e != nil {
				return e
			}
			if usageCount > 0 {
				return errors.New("您已使用过该礼品码")
			}
			// 增加用户额度
			if e := tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", redemption.Quota)).Error; e != nil {
				return e
			}
			// 写使用记录
			usage := &RedemptionUsage{RedemptionId: redemption.Id, UserId: userId, CreatedTime: common.GetTimestamp()}
			if e := tx.Create(usage).Error; e != nil {
				// 并发下唯一索引冲突，视为用户已使用过
				lowerMsg := strings.ToLower(e.Error())
				if strings.Contains(lowerMsg, "duplicate") || strings.Contains(lowerMsg, "unique") {
					return errors.New("您已使用过该礼品码")
				}
				return e
			}
			redemption.UsedCount += 1
			// 防御性：不允许 UsedCount 超过 MaxUse（有限制模式）
			if redemption.MaxUse != -1 && redemption.UsedCount > redemption.MaxUse {
				redemption.UsedCount = redemption.MaxUse
			}
			if redemption.RedeemedTime == 0 { // 记录首次使用时间
				redemption.RedeemedTime = common.GetTimestamp()
			}
			// 如果有限制并达到上限则标记为已使用
			if redemption.MaxUse != -1 && redemption.UsedCount >= redemption.MaxUse {
				redemption.Status = common.RedemptionCodeStatusUsed
			}
			return tx.Save(redemption).Error
		}

		return errors.New("未知的兑换码类型")
	})
	if err != nil {
		return 0, errors.New("兑换失败，" + err.Error())
	}
	RecordLog(userId, LogTypeTopup, fmt.Sprintf("通过兑换码充值 %s，兑换码ID %d", logger.LogQuota(redemption.Quota), redemption.Id))
	return redemption.Quota, nil
}

func (redemption *Redemption) Insert() error {
	return DB.Create(redemption).Error
}

func (redemption *Redemption) SelectUpdate() error {
	// This can update zero values
	return DB.Model(redemption).Select("redeemed_time", "status").Updates(redemption).Error
}

// Update Make sure your token's fields is completed, because this will update non-zero values
func (redemption *Redemption) Update() error {
	return DB.Model(redemption).Select("name", "status", "quota", "redeemed_time", "expired_time", "type", "max_use").Updates(redemption).Error
}

func (redemption *Redemption) Delete() error {
	return DB.Delete(redemption).Error
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

// BatchDeleteRedemptionsByNames 删除一批名称（分组名）下所有兑换码及其使用记录（礼品码）
// 返回删除的兑换码数量
func BatchDeleteRedemptionsByNames(names []string) (int64, error) {
	if len(names) == 0 {
		return 0, errors.New("参数错误")
	}
	returnValue := int64(0)
	err := DB.Transaction(func(tx *gorm.DB) error {
		// 先查询要删除的 id 列表
		var ids []int
		if e := tx.Model(&Redemption{}).Where("name IN ?", names).Pluck("id", &ids).Error; e != nil {
			return e
		}
		if len(ids) == 0 {
			return nil
		}
		// 删除礼品码使用记录
		if e := tx.Where("redemption_id IN ?", ids).Delete(&RedemptionUsage{}).Error; e != nil {
			return e
		}
		// 删除兑换码本身（软删）
		res := tx.Where("id IN ?", ids).Delete(&Redemption{})
		if res.Error != nil {
			return res.Error
		}
		returnValue = res.RowsAffected
		return nil
	})
	return returnValue, err
}
