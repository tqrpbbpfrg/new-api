package controller

import (
	"fmt"
	"net/http"
	"one-api/common"
	"one-api/model"
	"one-api/realtime"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// 管理端：列出奖品
func AdminListLotteryPrizes(c *gin.Context) {
	var prizes []model.LotteryPrize
	if err := model.DB.Order("id desc").Find(&prizes).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": prizes})
}

// 管理端：创建/更新奖品
func AdminUpsertLotteryPrize(c *gin.Context) {
	var p model.LotteryPrize
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误"})
		return
	}
	if p.Name == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "名称不能为空"})
		return
	}
	// 服务器端校验 quota_range 区间
	if p.Type == "quota_range" && p.RangeMax < p.RangeMin {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "区间无效"})
		return
	}
	if p.Rarity == "" {
		p.Rarity = "normal"
	}
	if p.Id == 0 { // create
		if p.TotalStock == 0 {
			p.TotalStock = p.Stock
		}
		if err := model.DB.Create(&p).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
			return
		}
	} else { // update（仅允许更新部分字段）
		updates := map[string]interface{}{
			"name":      p.Name,
			"type":      p.Type,
			"value":     p.Value,
			"range_min": p.RangeMin,
			"range_max": p.RangeMax,
			"weight":    p.Weight,
			"status":    p.Status,
			"rarity":    p.Rarity,
		}
		if p.Stock >= -1 { // 可调整库存
			updates["stock"] = p.Stock
		}
		if err := model.DB.Model(&model.LotteryPrize{}).Where("id = ?", p.Id).Updates(updates).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func AdminDeleteLotteryPrize(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id == 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误"})
		return
	}
	if err := model.DB.Delete(&model.LotteryPrize{}, id).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// 管理端：列出抽奖券兑换码
func AdminListTicketCodes(c *gin.Context) {
	var codes []model.LotteryTicketCode
	if err := model.DB.Order("id desc").Limit(200).Find(&codes).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": codes})
}

type createTicketCodeReq struct {
	Count   int `json:"count"`
	Tickets int `json:"tickets"`
}

// 管理端：批量生成抽奖券兑换码
func AdminCreateTicketCodes(c *gin.Context) {
	var req createTicketCodeReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Count <= 0 || req.Count > 100 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误"})
		return
	}
	if req.Tickets <= 0 {
		req.Tickets = 1
	}
	now := common.GetTimestamp()
	var codes []model.LotteryTicketCode
	for i := 0; i < req.Count; i++ {
		codes = append(codes, model.LotteryTicketCode{Code: common.GetUUID(), Tickets: req.Tickets, CreatedTime: now, Status: 1})
	}
	if err := model.DB.Create(&codes).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": codes})
}

// 用户：获取当前抽奖券数量与最近记录
func GetLotteryStatus(c *gin.Context) {
	if !common.LotteryEnabled {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "抽奖功能已关闭"})
		return
	}
	userId := c.GetInt("id")
	tickets, _ := model.GetUserTicketCount(userId)
	var lastRecords []model.LotteryDrawRecord
	model.DB.Where("user_id = ?", userId).Order("id desc").Limit(20).Find(&lastRecords)
	// 读取用户当前免费/双倍窗口
	var user model.User
	_ = model.DB.Select("free_quota_until,double_cost_until").Where("id = ?", userId).First(&user).Error
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"tickets":           tickets,
		"records":           lastRecords,
		"free_quota_until":  user.FreeQuotaUntil,
		"double_cost_until": user.DoubleCostUntil,
		"now":               common.GetTimestamp(),
	}})
}

// 用户端：公开奖池（不暴露精确权重，提供相对权重与稀有度）
func GetLotteryPool(c *gin.Context) {
	if !common.LotteryEnabled {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "抽奖功能已关闭"})
		return
	}
	var prizes []model.LotteryPrize
	if err := model.DB.Select("id,name,type,value,weight,stock,rarity,status").Where("status=1 AND (stock != 0)").Order("weight desc").Find(&prizes).Error; err != nil {
		c.JSON(200, gin.H{"success": false, "message": err.Error()})
		return
	}
	// 处理权重 -> 相对百分比（可选：为防止推断真实权重不提供总和）
	total := 0
	for _, p := range prizes {
		if p.Weight > 0 {
			total += p.Weight
		}
	}
	type prizeView struct {
		Id        int     `json:"id"`
		Name      string  `json:"name"`
		Type      string  `json:"type"`
		Value     int     `json:"value"`
		Rarity    string  `json:"rarity"`
		Stock     int     `json:"stock"`
		WeightPct float64 `json:"weight_pct"`
	}
	res := make([]prizeView, 0, len(prizes))
	for _, p := range prizes {
		pct := 0.0
		if total > 0 && p.Weight > 0 {
			pct = float64(p.Weight) / float64(total)
		}
		res = append(res, prizeView{Id: p.Id, Name: p.Name, Type: p.Type, Value: p.Value, Rarity: p.Rarity, Stock: p.Stock, WeightPct: pct})
	}
	c.JSON(200, gin.H{"success": true, "data": res})
}

// 用户：执行抽奖
type drawReq struct {
	Cost int `json:"cost"`
}

func PostLotteryDraw(c *gin.Context) {
	if !common.LotteryEnabled {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "抽奖功能已关闭"})
		return
	}
	userId := c.GetInt("id")
	var req drawReq
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Cost = 1
	}
	rec, err := model.DrawOnce(userId, req.Cost)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	model.RecordLog(userId, model.LogTypeLottery, fmt.Sprintf("抽奖获得 %s(%s) 值=%d", rec.PrizeName, rec.PrizeType, rec.Value))
	// 稀有度广播（忽略普通 normal）
	var prize model.LotteryPrize
	if err := model.DB.Select("rarity").First(&prize, rec.PrizeId).Error; err == nil {
		if prize.Rarity == "rare" || prize.Rarity == "epic" || prize.Rarity == "legend" {
			username, _ := model.GetUsernameById(userId, false)
			if username == "" {
				username = "User"
			}
			realtime.BroadcastRarePrize(prize.Rarity, rec.PrizeName, username)
		}
	}
	// 附加用户窗口时间，便于前端即时刷新
	var user model.User
	_ = model.DB.Select("free_quota_until,double_cost_until").Where("id = ?", userId).First(&user).Error
	// 生成简单 message（前端可根据类型二次本地化）
	msg := rec.PrizeName
	switch rec.PrizeType {
	case "quota":
		if rec.Value > 0 {
			msg = fmt.Sprintf("获得额度 %+d", rec.Value)
		}
	case "quota_range":
		msg = fmt.Sprintf("获得随机额度 %+d", rec.Value)
	case "ticket":
		if rec.Value > 0 {
			msg = fmt.Sprintf("获得抽奖券 %+d", rec.Value)
		}
	case "free_hours":
		if rec.Value > 0 {
			msg = fmt.Sprintf("获得免费期 %d 小时", rec.Value)
		}
	case "double_hours":
		if rec.Value > 0 {
			msg = fmt.Sprintf("获得双倍期 %d 小时", rec.Value)
		}
	}
	if rec.PrizeType == "free_hours" || rec.PrizeType == "double_hours" {
		model.RecordLog(userId, model.LogTypeBonusWindow, msg)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": rec, "windows": gin.H{"free_quota_until": user.FreeQuotaUntil, "double_cost_until": user.DoubleCostUntil, "now": common.GetTimestamp()}, "message": msg})
}

// 十连 / 多次抽奖
type multiDrawReq struct {
	Times int `json:"times"`
	Cost  int `json:"cost"`
}

func PostLotteryMultiDraw(c *gin.Context) {
	if !common.LotteryEnabled {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "抽奖功能已关闭"})
		return
	}
	userId := c.GetInt("id")
	var req multiDrawReq
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Times = 10
		req.Cost = 1
	}
	if req.Times <= 0 {
		req.Times = 10
	}
	if req.Cost <= 0 {
		req.Cost = 1
	}
	recs, err := model.DrawMultiple(userId, req.Times, req.Cost)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	if len(recs) > 0 {
		model.RecordLog(userId, model.LogTypeLottery, fmt.Sprintf("多次抽奖%d次，首个奖品 %s(%s)", req.Times, recs[0].PrizeName, recs[0].PrizeType))
	}
	// 聚合窗口奖励
	var addFree, addDouble int
	for _, r := range recs {
		if r.PrizeType == "free_hours" && r.Value > 0 {
			addFree += r.Value
		}
		if r.PrizeType == "double_hours" && r.Value > 0 {
			addDouble += r.Value
		}
	}
	if addFree > 0 {
		model.RecordLog(userId, model.LogTypeBonusWindow, fmt.Sprintf("批量抽奖累计获得免费期 %d 小时", addFree))
	}
	if addDouble > 0 {
		model.RecordLog(userId, model.LogTypeBonusWindow, fmt.Sprintf("批量抽奖累计获得双倍期 %d 小时", addDouble))
	}
	// 统计稀有奖品并广播（只发一次，包含数量）
	rareCount := map[string]int{}
	for _, r := range recs {
		var prize model.LotteryPrize
		if err := model.DB.Select("rarity").First(&prize, r.PrizeId).Error; err == nil {
			if prize.Rarity == "rare" || prize.Rarity == "epic" || prize.Rarity == "legend" {
				rareCount[prize.Rarity]++
			}
		}
	}
	if len(rareCount) > 0 {
		username, _ := model.GetUsernameById(userId, false)
		if username == "" {
			username = "User"
		}
		// 合并成一条摘要：legend/epic/rare 优先顺序
		order := []string{"legend", "epic", "rare"}
		summaryParts := []string{}
		for _, k := range order {
			if v, ok := rareCount[k]; ok {
				summaryParts = append(summaryParts, fmt.Sprintf("%s x%d", k, v))
			}
		}
		if len(summaryParts) > 0 {
			realtime.BroadcastRarePrize(strings.Join(order, ","), summaryParts[0], username)
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": recs})
}

// 用户：兑换抽奖券码
type redeemReq struct {
	Code string `json:"code"`
}

func PostLotteryRedeem(c *gin.Context) {
	if !common.LotteryEnabled {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "抽奖功能已关闭"})
		return
	}
	userId := c.GetInt("id")
	var req redeemReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Code == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误"})
		return
	}
	tickets, err := model.RedeemTicketCode(req.Code, userId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"tickets": tickets}})
}
