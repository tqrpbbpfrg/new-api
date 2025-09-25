package controller

import (
	"net/http"
	"one-api/common"
	"one-api/model"
	"one-api/realtime"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// list self inbox (broadcast + direct)
func ListMessages(c *gin.Context) {
	uid := c.GetInt("id")
	sizeStr := c.Query("size")
	afterStr := c.Query("after")
	withTotal := c.Query("with_total") == "1"
	size := 20
	if v, err := strconv.Atoi(sizeStr); err == nil && v > 0 {
		size = v
	}
	if size > 100 {
		size = 100
	}
	// keyset pagination: fetch messages with id < after (if provided)
	var afterId int
	if v, err := strconv.Atoi(afterStr); err == nil && v > 0 {
		afterId = v
	}
	// audience segmentation for broadcast (receiver_id=0) at query time for performance
	var user model.User
	_ = model.DB.Select("created_at,last_login_at").First(&user, uid).Error
	now := time.Now()
	newUser := user.CreatedAt.After(now.Add(-7 * 24 * time.Hour))
	activeUser := false
	if user.LastLoginAt != nil && *user.LastLoginAt >= now.Add(-30*24*time.Hour).Unix() {
		activeUser = true
	}
	q := model.DB.Where("receiver_id = ?", uid)
	// build OR conditions for broadcasts user qualifies for
	brConditions := []string{"receiver_id=0 AND (audience='' OR audience='all'"}
	if newUser {
		brConditions = append(brConditions, "audience='new'")
	}
	if activeUser {
		brConditions = append(brConditions, "audience='active'")
	}
	// close bracket
	cond := brConditions[0]
	// append additional OR parts (skip index 0 base header)
	for i := 1; i < len(brConditions); i++ {
		cond += " OR " + brConditions[i]
	}
	cond += ")"
	q = q.Or(cond)
	if afterId > 0 {
		q = q.Where("id < ?", afterId)
	}
	var messages []model.Message
	if err := q.Order("id DESC").Limit(size).Find(&messages).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	var total int64 = 0
	if withTotal {
		model.DB.Model(&model.Message{}).Where("receiver_id = ? OR receiver_id = 0", uid).Count(&total)
	}

	// fetch read flags
	var ids []int
	for _, m := range messages {
		ids = append(ids, m.Id)
	}
	readMap := map[int]bool{}
	if len(ids) > 0 {
		var reads []model.MessageRead
		_ = model.DB.Where("user_id=? AND message_id IN ?", uid, ids).Find(&reads).Error
		for _, r := range reads {
			readMap[r.MessageId] = true
		}
	}
	arr := make([]map[string]any, 0, len(messages))
	for _, m := range messages {
		arr = append(arr, map[string]any{
			"id":           m.Id,
			"sender_id":    m.SenderId,
			"receiver_id":  m.ReceiverId,
			"subject":      m.Subject,
			"content":      m.Content,
			"reply_to":     m.ReplyTo,
			"created_at":   m.CreatedAt.Format("2006-01-02 15:04:05"),
			"is_read":      readMap[m.Id],
			"is_broadcast": m.ReceiverId == 0,
		})
	}
	nextAfter := 0
	if len(messages) > 0 {
		nextAfter = messages[len(messages)-1].Id
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": map[string]any{"items": arr, "size": size, "next_after": nextAfter, "total": total}})
}

// send (admin) or reply (user) - if receiver_id=0 broadcast (admin only)
type SendMessageRequest struct {
	ReceiverId int    `json:"receiver_id"`
	Subject    string `json:"subject"`
	Content    string `json:"content"`
	ReplyTo    *int   `json:"reply_to"`
	Audience   string `json:"audience"` // all,new,active,direct (direct = use receiver_id / reply logic)
}

func SendMessage(c *gin.Context) {
	uid := c.GetInt("id")
	role := c.GetInt("role")
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误"})
		return
	}
	if req.Content == "" {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "内容不能为空"})
		return
	}
	if len(req.Subject) > 100 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "主题长度超限(<=100)"})
		return
	}
	if len([]rune(req.Content)) > 5000 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "内容长度超限(<=5000字符)"})
		return
	}
	if req.Audience == "" {
		req.Audience = "direct"
	}
	if req.ReceiverId == 0 && req.Audience == "direct" && role < common.RoleAdminUser {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无权限发送广播"})
		return
	}
	if req.ReplyTo != nil {
		// ensure parent belongs to user (if not admin) or accessible
		var parent model.Message
		if err := model.DB.First(&parent, *req.ReplyTo).Error; err == nil {
			if role < common.RoleAdminUser { // user replying must be receiver or sender
				if parent.ReceiverId != uid && parent.SenderId != uid && parent.ReceiverId != 0 {
					c.JSON(http.StatusOK, gin.H{"success": false, "message": "无权限回复"})
					return
				}
				// derive receiver: if parent sender is self -> reply to original receiver (or broadcast deny)
				if parent.ReceiverId == 0 { // broadcast threads cannot be directly replied from normal user
					if parent.SenderId != uid {
						req.ReceiverId = parent.SenderId
					} else {
						c.JSON(http.StatusOK, gin.H{"success": false, "message": "不能回复广播"})
						return
					}
				} else {
					if parent.SenderId == uid {
						req.ReceiverId = parent.ReceiverId
					} else {
						req.ReceiverId = parent.SenderId
					}
				}
			}
		}
	}
	// audience broadcast segmentation (admin only)
	totalTargets := 1
	receiverId := req.ReceiverId
	audience := req.Audience
	if audience != "direct" {
		if role < common.RoleAdminUser {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "无权限使用分组广播"})
			return
		}
		// 简单发送频率限制：1小时内非 direct 广播 <=10 条
		var recent int64
		model.DB.Model(&model.Message{}).Where("sender_id=? AND receiver_id=0 AND created_at >= ?", uid, time.Now().Add(-1*time.Hour)).Count(&recent)
		if recent >= 10 {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "广播发送过于频繁，请稍后再试"})
			return
		}
		// calculate target users
		var count int64
		query := model.DB.Model(&model.User{})
		switch audience {
		case "all":
			query.Count(&count)
			receiverId = 0
		case "new":
			// 7天内注册
			query.Where("created_at >= ?", time.Now().Add(-7*24*time.Hour)).Count(&count)
			receiverId = 0
		case "active":
			// 最近30天登录活跃用户（依赖 last_login_at）
			query.Where("last_login_at >= ?", time.Now().Add(-30*24*time.Hour).Unix()).Count(&count)
			receiverId = 0
		default:
			audience = "direct"
		}
		if audience != "direct" {
			if count == 0 {
				c.JSON(http.StatusOK, gin.H{"success": false, "message": "目标用户为空"})
				return
			}
			totalTargets = int(count)
		}
	}
	msg := model.Message{SenderId: uid, ReceiverId: receiverId, Subject: req.Subject, Content: req.Content, ReplyTo: req.ReplyTo, CreatedAt: time.Now(), Audience: audience, TotalTargets: totalTargets}
	if err := model.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	// realtime push (best-effort)
	if msg.ReceiverId == 0 {
		realtime.BroadcastMessage(&msg)
	} else {
		realtime.PushMessageToUser(msg.ReceiverId, &msg)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": map[string]any{"id": msg.Id, "total_targets": totalTargets}})
}

type MarkReadRequest struct {
	Ids []int `json:"ids"`
}

func MarkMessagesRead(c *gin.Context) {
	uid := c.GetInt("id")
	var req MarkReadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误"})
		return
	}
	now := time.Now()
	for _, id := range req.Ids {
		if id <= 0 {
			continue
		}
		model.DB.FirstOrCreate(&model.MessageRead{}, model.MessageRead{MessageId: id, UserId: uid, ReadAt: now})
	}
	// latency: create first-read record (ignore direct messages optionally? keep all for simplicity)
	for _, id := range req.Ids {
		if id <= 0 {
			continue
		}
		model.DB.FirstOrCreate(&model.MessageReadLatency{}, model.MessageReadLatency{MessageId: id, UserId: uid, FirstRead: now})
	}
	// invalidate cache & push unread update
	realtime.InvalidateUnread(uid)
	realtime.PushUnread(uid)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

// unread count
func UnreadCount(c *gin.Context) {
	uid := c.GetInt("id")
	// align with audience-aware unread logic (duplicate of realtime.computeUnread)
	realtime.InvalidateUnread(uid)
	// push unread returns via SSE; for HTTP we recompute directly (copy minimal logic?) reuse internal by calling a small helper - but not exported.
	// fallback: replicate minimal (cannot access unexported). We'll just run raw audience filter query again (same as computeUnread) for accuracy.
	var user model.User
	_ = model.DB.Select("created_at,last_login_at").First(&user, uid).Error
	now := time.Now()
	newUser := 0
	activeUser := 0
	if !user.CreatedAt.IsZero() && user.CreatedAt.After(now.Add(-7*24*time.Hour)) {
		newUser = 1
	}
	if user.LastLoginAt != nil && *user.LastLoginAt >= now.Add(-30*24*time.Hour).Unix() {
		activeUser = 1
	}
	var unread int64
	model.DB.Raw(`SELECT COUNT(*) FROM messages m LEFT JOIN message_reads r ON m.id=r.message_id AND r.user_id=?
        WHERE r.id IS NULL AND (m.receiver_id=? OR (m.receiver_id=0 AND (m.audience='all' OR m.audience='' OR (m.audience='new' AND ?) OR (m.audience='active' AND ?))))`, uid, uid, newUser, activeUser).Scan(&unread)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": map[string]int64{"unread": unread}})
}

// Get message thread (ancestors + children) for viewing a conversation context
func GetMessageThread(c *gin.Context) {
	uid := c.GetInt("id")
	idStr := c.Param("id")
	mid, err := strconv.Atoi(idStr)
	if err != nil || mid <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误"})
		return
	}
	var msg model.Message
	if err := model.DB.First(&msg, mid).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "消息不存在"})
		return
	}
	// permission: user must be sender/receiver or broadcast
	if msg.ReceiverId != 0 && msg.SenderId != uid && msg.ReceiverId != uid {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无权限查看"})
		return
	}
	// build ancestor chain
	ancestors := []model.Message{}
	cur := msg
	for cur.ReplyTo != nil {
		var p model.Message
		if err := model.DB.First(&p, *cur.ReplyTo).Error; err != nil {
			break
		}
		// same permission check
		if p.ReceiverId != 0 && p.SenderId != uid && p.ReceiverId != uid {
			break
		}
		ancestors = append([]model.Message{p}, ancestors...)
		cur = p
	}
	// fetch children (direct replies)
	var children []model.Message
	model.DB.Where("reply_to=?", mid).Order("id ASC").Find(&children)
	arrAnc := make([]map[string]any, 0, len(ancestors))
	for _, m := range ancestors {
		arrAnc = append(arrAnc, map[string]any{"id": m.Id, "sender_id": m.SenderId, "receiver_id": m.ReceiverId, "subject": m.Subject, "content": m.Content, "reply_to": m.ReplyTo, "created_at": m.CreatedAt})
	}
	mainObj := map[string]any{"id": msg.Id, "sender_id": msg.SenderId, "receiver_id": msg.ReceiverId, "subject": msg.Subject, "content": msg.Content, "reply_to": msg.ReplyTo, "created_at": msg.CreatedAt, "audience": msg.Audience}
	arrChildren := make([]map[string]any, 0, len(children))
	for _, m := range children {
		arrChildren = append(arrChildren, map[string]any{"id": m.Id, "sender_id": m.SenderId, "receiver_id": m.ReceiverId, "subject": m.Subject, "content": m.Content, "reply_to": m.ReplyTo, "created_at": m.CreatedAt})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": map[string]any{"ancestors": arrAnc, "message": mainObj, "replies": arrChildren}})
}

// Admin: list sent broadcast/direct messages with read stats (only messages sent by admin or broadcasts)
func AdminListSentMessages(c *gin.Context) {
	role := c.GetInt("role")
	uid := c.GetInt("id")
	if role < common.RoleAdminUser {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无权限"})
		return
	}
	sizeStr := c.Query("size")
	afterStr := c.Query("after")
	withTotal := c.Query("with_total") == "1"
	size := 20
	if v, err := strconv.Atoi(sizeStr); err == nil && v > 0 {
		size = v
	}
	if size > 100 {
		size = 100
	}
	var afterId int
	if v, err := strconv.Atoi(afterStr); err == nil && v > 0 {
		afterId = v
	}
	q := model.DB.Where("sender_id=? OR receiver_id=0", uid)
	if afterId > 0 {
		q = q.Where("id < ?", afterId)
	}
	var msgs []model.Message
	if err := q.Order("id DESC").Limit(size).Find(&msgs).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	var total int64
	if withTotal {
		model.DB.Model(&model.Message{}).Where("sender_id=? OR receiver_id=0", uid).Count(&total)
	}
	// collect ids
	ids := make([]int, 0, len(msgs))
	for _, m := range msgs {
		ids = append(ids, m.Id)
	}
	readCountMap := map[int]int{}
	if len(ids) > 0 {
		type tmp struct {
			MessageId int
			Cnt       int
		}
		var rows []tmp
		model.DB.Raw("SELECT message_id, COUNT(*) as cnt FROM message_reads WHERE message_id IN ? GROUP BY message_id", ids).Scan(&rows)
		for _, r := range rows {
			readCountMap[r.MessageId] = r.Cnt
		}
	}
	arr := make([]map[string]any, 0, len(msgs))
	for _, m := range msgs {
		totalTargets := m.TotalTargets
		if totalTargets == 0 { // fallback
			if m.ReceiverId == 0 {
				totalTargets = 0
			} else {
				totalTargets = 1
			}
		}
		arr = append(arr, map[string]any{
			"id":            m.Id,
			"subject":       m.Subject,
			"audience":      m.Audience,
			"total_targets": totalTargets,
			"read_count":    readCountMap[m.Id],
			"created_at":    m.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}
	nextAfter := 0
	if len(msgs) > 0 {
		nextAfter = msgs[len(msgs)-1].Id
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": map[string]any{"items": arr, "total": total, "size": size, "next_after": nextAfter}})
}

// Bulk mark all read for current user
func MarkAllRead(c *gin.Context) {
	uid := c.GetInt("id")
	now := time.Now()
	sql := `INSERT INTO message_reads (message_id,user_id,read_at)
            SELECT m.id, ?, ? FROM messages m
            LEFT JOIN message_reads r ON m.id=r.message_id AND r.user_id=?
            WHERE (m.receiver_id=? OR m.receiver_id=0) AND r.id IS NULL`
	model.DB.Exec(sql, uid, now, uid, uid)
	// latency table bulk insert missing
	sql2 := `INSERT INTO message_read_latencies (message_id,user_id,first_read)
             SELECT m.id, ?, ? FROM messages m
             LEFT JOIN message_read_latencies l ON m.id=l.message_id AND l.user_id=?
             WHERE (m.receiver_id=? OR m.receiver_id=0) AND l.id IS NULL`
	model.DB.Exec(sql2, uid, now, uid, uid)
	realtime.InvalidateUnread(uid)
	realtime.PushUnread(uid)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

// SSE stream endpoint
func MessageStream(c *gin.Context) {
	uid := c.GetInt("id")
	realtime.ServeSSE(c.Writer, c.Request, uid)
}

// Admin latency & reach stats for a single message (broadcast or direct) by id
func AdminMessageStats(c *gin.Context) {
	role := c.GetInt("role")
	if role < common.RoleAdminUser {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无权限"})
		return
	}
	midStr := c.Param("id")
	mid, err := strconv.Atoi(midStr)
	if err != nil || mid <= 0 {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "参数错误"})
		return
	}
	var msg model.Message
	if err := model.DB.First(&msg, mid).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "消息不存在"})
		return
	}
	// read count (already tracked)
	var readCount int64
	model.DB.Model(&model.MessageRead{}).Where("message_id=?", mid).Count(&readCount)
	// latency distribution buckets (分钟): 1,5,15,60,180,1440,>1440
	type row struct {
		M int   `json:"m"`
		C int64 `json:"c"`
	}
	var rows []row
	model.DB.Raw(`SELECT CEIL((EXTRACT(EPOCH FROM (first_read - ?))/60.0)) as m, COUNT(*) as c FROM message_read_latencies WHERE message_id=? GROUP BY m`, msg.CreatedAt, mid).Scan(&rows)
	buckets := map[string]int64{"<=1": 0, "<=5": 0, "<=15": 0, "<=60": 0, "<=180": 0, "<=1440": 0, ">1440": 0}
	for _, r := range rows {
		m := r.M
		switch {
		case m <= 1:
			buckets["<=1"] += r.C
		case m <= 5:
			buckets["<=5"] += r.C
		case m <= 15:
			buckets["<=15"] += r.C
		case m <= 60:
			buckets["<=60"] += r.C
		case m <= 180:
			buckets["<=180"] += r.C
		case m <= 1440:
			buckets["<=1440"] += r.C
		default:
			buckets[">1440"] += r.C
		}
	}
	// reach percent (readCount / totalTargets) for broadcast audiences
	totalTargets := msg.TotalTargets
	reachRate := 0.0
	if totalTargets > 0 {
		reachRate = float64(readCount) / float64(totalTargets)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": map[string]any{
		"message_id":      mid,
		"read_count":      readCount,
		"total_targets":   totalTargets,
		"reach_rate":      reachRate,
		"latency_buckets": buckets,
	}})
}

// Admin aggregate recent broadcast performance summary (last N broadcasts)
func AdminBroadcastSummary(c *gin.Context) {
	role := c.GetInt("role")
	if role < common.RoleAdminUser {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "无权限"})
		return
	}
	limitStr := c.Query("limit")
	limit := 20
	if v, err := strconv.Atoi(limitStr); err == nil && v > 0 && v <= 100 {
		limit = v
	}
	var msgs []model.Message
	model.DB.Where("receiver_id=0").Order("id DESC").Limit(limit).Find(&msgs)
	ids := make([]int, 0, len(msgs))
	for _, m := range msgs {
		ids = append(ids, m.Id)
	}
	// read counts
	type rc struct {
		MessageId int
		C         int64
	}
	readMap := map[int]int64{}
	if len(ids) > 0 {
		var arr []rc
		model.DB.Raw("SELECT message_id, COUNT(*) as c FROM message_reads WHERE message_id IN ? GROUP BY message_id", ids).Scan(&arr)
		for _, r := range arr {
			readMap[r.MessageId] = r.C
		}
	}
	// latency median (approx): compute 50th percentile by scanning latencies (simple approach, acceptable for summary size)
	medianMap := map[int]float64{}
	for _, m := range msgs {
		var lats []int64
		model.DB.Raw("SELECT EXTRACT(EPOCH FROM (first_read - ?)) as sec FROM message_read_latencies WHERE message_id=?", m.CreatedAt, m.Id).Scan(&lats)
		if len(lats) > 0 { // sort insertion (small size)
			// simple selection
			// convert to minutes
			// partial quickselect could be used but not needed here
			for i := 0; i < len(lats); i++ {
				for j := i + 1; j < len(lats); j++ {
					if lats[j] < lats[i] {
						lats[i], lats[j] = lats[j], lats[i]
					}
				}
			}
			mid := len(lats) / 2
			val := lats[mid]
			if len(lats)%2 == 0 {
				val = (lats[mid-1] + lats[mid]) / 2
			}
			medianMap[m.Id] = float64(val) / 60.0
		} else {
			medianMap[m.Id] = 0
		}
	}
	items := make([]map[string]any, 0, len(msgs))
	for _, m := range msgs {
		rc := readMap[m.Id]
		tr := m.TotalTargets
		reach := 0.0
		if tr > 0 {
			reach = float64(rc) / float64(tr)
		}
		items = append(items, map[string]any{
			"id":                 m.Id,
			"subject":            m.Subject,
			"created_at":         m.CreatedAt.Format("2006-01-02 15:04:05"),
			"read_count":         rc,
			"total_targets":      tr,
			"reach_rate":         reach,
			"median_latency_min": medianMap[m.Id],
			"audience":           m.Audience,
		})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": map[string]any{"items": items}})
}
