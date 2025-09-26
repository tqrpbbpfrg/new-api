package controller

import (
	"net/http"
	"one-api/common"
	"one-api/dto"
	"one-api/model"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AdminSendMail 说明：
// 用户方需求此“邮件”仅作为系统内双向信息通道的别名，不执行真实 SMTP 推送。
// 因此这里不调用 common.SendEmail，而是：
//  1. audience = all / active / new -> 生成一条广播站内信 (receiver_id=0, audience 字段标记分组)
//  2. audience = custom -> 为每个指定 UID 生成一条 direct 站内信
//
// 返回统计信息，供前端展示。未来若需要异步/任务化，可再扩展。
func AdminSendMail(c *gin.Context) {
	_, exists := c.Get("id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	roleInterface, _ := c.Get("role")
	role := roleInterface.(int)
	if role < common.RoleAdminUser { // require admin
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	// 简单频率限制：60 秒内最多 5 次（可调）
	if common.RedisEnabled {
		key := "admin_mail_rate:" + time.Now().Format("200601021504") // 分控 + 保留秒内多个
		// 使用 INCR 并设置过期
		if err := common.RDB.Incr(c, key).Err(); err == nil {
			common.RDB.Expire(c, key, 120*time.Second)
			cnt, _ := common.RDB.Get(c, key).Int()
			if cnt > 5 { // 超过阈值
				c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate limited"})
				return
			}
		}
	}

	var req dto.AdminMailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Audience == "custom" && len(req.UIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "uids required for custom audience"})
		return
	}

	db := model.DB

	subject := req.Subject
	if len(subject) > 200 { // 冗余保护（DTO 已限制）
		subject = subject[:200]
	}
	content := sanitizeMarkdown(req.Content)
	if len([]rune(content)) > 8000 { // 限制
		content = string([]rune(content)[:8000])
	}

	audience := req.Audience
	if audience == "custom" {
		unique := map[int]struct{}{}
		validUIDs := make([]int, 0, len(req.UIDs))
		for _, id := range req.UIDs {
			if id <= 0 {
				continue
			}
			if _, ok := unique[id]; ok {
				continue
			}
			unique[id] = struct{}{}
			validUIDs = append(validUIDs, id)
		}
		if len(validUIDs) == 0 {
			c.JSON(http.StatusOK, dto.AdminMailResponse{TaskID: newTaskID(), TotalTargets: 0, Accepted: 0, Skipped: 0, Audience: audience})
			return
		}
		var users []model.User
		if err := db.Select("id,status").Where("id IN ?", validUIDs).Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		existing := map[int]bool{}
		for _, u := range users {
			if u.Status == common.UserStatusEnabled {
				existing[u.Id] = true
			}
		}
		messages := make([]model.Message, 0, len(validUIDs))
		for _, uid := range validUIDs {
			if !existing[uid] {
				continue
			}
			messages = append(messages, model.Message{SenderId: 0, ReceiverId: uid, Subject: subject, Content: content, CreatedAt: time.Now(), Audience: "direct", TotalTargets: 1})
		}
		if len(messages) == 0 {
			c.JSON(http.StatusOK, dto.AdminMailResponse{TaskID: newTaskID(), TotalTargets: len(validUIDs), Accepted: 0, Skipped: len(validUIDs), Audience: audience})
			return
		}
		// 事务批量插入
		var insertedIDs []int
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&messages).Error; err != nil {
				return err
			}
			for _, m := range messages {
				insertedIDs = append(insertedIDs, m.Id)
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		accepted := len(messages)
		c.JSON(http.StatusOK, dto.AdminMailResponse{TaskID: newTaskID(), TotalTargets: len(validUIDs), Accepted: accepted, Skipped: len(validUIDs) - accepted, Audience: audience, MessageIDs: insertedIDs})
		return
	}

	// 广播分组：生成单条 receiver_id=0 记录，与现有消息系统的 audience 过滤一致
	var count int64
	userQuery := db.Model(&model.User{})
	switch audience {
	case "all":
		userQuery.Count(&count)
	case "active":
		userQuery.Where("last_login_at >= ?", time.Now().Add(-30*24*time.Hour).Unix()).Count(&count)
	case "new":
		userQuery.Where("created_at >= ?", time.Now().Add(-7*24*time.Hour)).Count(&count)
	default:
		audience = "all"
		userQuery.Count(&count)
	}
	if count == 0 {
		c.JSON(http.StatusOK, dto.AdminMailResponse{TaskID: newTaskID(), TotalTargets: 0, Accepted: 0, Skipped: 0, Audience: audience})
		return
	}
	msg := model.Message{SenderId: 0, ReceiverId: 0, Subject: subject, Content: content, CreatedAt: time.Now(), Audience: audience, TotalTargets: int(count)}
	if err := db.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	id := msg.Id
	c.JSON(http.StatusOK, dto.AdminMailResponse{TaskID: newTaskID(), TotalTargets: int(count), Accepted: 1, Skipped: 0, Audience: audience, MessageID: &id})
}

// newTaskID 生成简单任务标识
func newTaskID() string { return "mail-" + strconv.FormatInt(time.Now().UnixNano(), 10) }

// sanitizeMarkdown: remove potentially dangerous control chars & script tags (basic pass)
var scriptTagRegex = regexp.MustCompile(`(?i)<script.*?>[\s\S]*?</script>`)

func sanitizeMarkdown(in string) string {
	if in == "" {
		return in
	}
	// strip script blocks
	out := scriptTagRegex.ReplaceAllString(in, "")
	// remove NULL bytes & \r
	out = strings.ReplaceAll(out, "\x00", "")
	out = strings.ReplaceAll(out, "\r", "")
	return out
}
