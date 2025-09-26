package controller

import (
	"errors"
	"net/http"
	"one-api/common"
	"one-api/model"
	"strconv"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

func GetAllRedemptions(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	codeType := c.Query("type")
	redemptions, total, err := model.GetAllRedemptions(pageInfo.GetStartIdx(), pageInfo.GetPageSize(), codeType)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(redemptions)
	common.ApiSuccess(c, pageInfo)
}

func SearchRedemptions(c *gin.Context) {
	keyword := c.Query("keyword")
	codeType := c.Query("type")
	pageInfo := common.GetPageQuery(c)
	redemptions, total, err := model.SearchRedemptions(keyword, pageInfo.GetStartIdx(), pageInfo.GetPageSize(), codeType)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(redemptions)
	common.ApiSuccess(c, pageInfo)
}

func GetRedemption(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	redemption, err := model.GetRedemptionById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    redemption,
	})
}

func AddRedemption(c *gin.Context) {
	redemption := model.Redemption{}
	err := c.ShouldBindJSON(&redemption)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if utf8.RuneCountInString(redemption.Name) == 0 || utf8.RuneCountInString(redemption.Name) > 20 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "兑换码名称长度必须在1-20之间",
		})
		return
	}
	if redemption.Count <= 0 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "兑换码个数必须大于0",
		})
		return
	}
	// 校验礼品码多次使用次数（仅 gift 有效）
	if redemption.Type == "gift" {
		// -1 表示不限人数
		if redemption.MaxUse == -1 {
			// accept unlimited
		} else {
			if redemption.MaxUse <= 1 {
				c.JSON(http.StatusOK, gin.H{"success": false, "message": "礼品码最大使用次数必须大于1，或填 -1 表示不限"})
				return
			}
			if redemption.MaxUse > 10000 { // 防滥用上限
				c.JSON(http.StatusOK, gin.H{"success": false, "message": "礼品码最大使用次数不能超过10000"})
				return
			}
		}
	}
	if redemption.Count > 100 {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "一次兑换码批量生成的个数不能大于 100",
		})
		return
	}
	if err := validateExpiredTime(redemption.ExpiredTime); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	var keys []string
	for i := 0; i < redemption.Count; i++ {
		key := common.GetUUID()
		cleanRedemption := model.Redemption{
			UserId:      c.GetInt("id"),
			Name:        redemption.Name,
			Type:        redemption.Type,
			MaxUse:      redemption.MaxUse,
			Key:         key,
			CreatedTime: common.GetTimestamp(),
			Quota:       redemption.Quota,
			ExpiredTime: redemption.ExpiredTime,
		}
		err = cleanRedemption.Insert()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
				"data":    keys,
			})
			return
		}
		keys = append(keys, key)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    keys,
	})
}

func DeleteRedemption(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	err := model.DeleteRedemptionById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func UpdateRedemption(c *gin.Context) {
	statusOnly := c.Query("status_only")
	redemption := model.Redemption{}
	err := c.ShouldBindJSON(&redemption)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	cleanRedemption, err := model.GetRedemptionById(redemption.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if statusOnly == "" {
		if err := validateExpiredTime(redemption.ExpiredTime); err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
			return
		}
		// If you add more fields, please also update redemption.Update()
		cleanRedemption.Name = redemption.Name
		cleanRedemption.Quota = redemption.Quota
		cleanRedemption.ExpiredTime = redemption.ExpiredTime
		if redemption.Type != "" {
			cleanRedemption.Type = redemption.Type
		}
		if redemption.Type == "gift" {
			// 允许 -1 或 >1
			if redemption.MaxUse == -1 || redemption.MaxUse > 1 {
				cleanRedemption.MaxUse = redemption.MaxUse
			}
		}
	}
	if statusOnly != "" {
		cleanRedemption.Status = redemption.Status
	}
	err = cleanRedemption.Update()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    cleanRedemption,
	})
}

func DeleteInvalidRedemption(c *gin.Context) {
	rows, err := model.DeleteInvalidRedemptions()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    rows,
	})
}

// RedemptionNameBatch 用于批量按名称删除
type RedemptionNameBatch struct {
	Names []string `json:"names"`
}

// BatchDeleteRedemptionByNames 按名称批量删除一组兑换码
func BatchDeleteRedemptionByNames(c *gin.Context) {
	payload := RedemptionNameBatch{}
	if err := c.ShouldBindJSON(&payload); err != nil || len(payload.Names) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误"})
		return
	}
	rows, err := model.BatchDeleteRedemptionsByNames(payload.Names)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": rows})
}

func validateExpiredTime(expired int64) error {
	if expired != 0 && expired < common.GetTimestamp() {
		return errors.New("过期时间不能早于当前时间")
	}
	return nil
}
