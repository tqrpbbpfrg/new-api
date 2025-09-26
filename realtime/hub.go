package realtime

import (
	"context"
	"encoding/json"
	"net/http"
	"one-api/common"
	"one-api/model"
	"strconv"
	"sync"
	"time"
)

// Simple SSE hub (best-effort). Replace with Redis pub/sub if scaling horizontally.

type client struct {
	uid int
	ch  chan string
}

var (
	mu              sync.RWMutex
	clients         = map[int]map[*client]struct{}{}
	redisPubSubOnce sync.Once
	// unreadCache: short-lived cache to coalesce bursts of unread recomputations
	unreadCache = struct {
		sync.RWMutex
		m map[int]struct {
			Count int64
			Ts    time.Time
		}
	}{m: map[int]struct {
		Count int64
		Ts    time.Time
	}{}}
)

func register(uid int) *client {
	c := &client{uid: uid, ch: make(chan string, 16)}
	mu.Lock()
	if clients[uid] == nil {
		clients[uid] = map[*client]struct{}{}
	}
	clients[uid][c] = struct{}{}
	mu.Unlock()
	return c
}

func remove(c *client) {
	mu.Lock()
	set := clients[c.uid]
	if set != nil {
		delete(set, c)
		if len(set) == 0 {
			delete(clients, c.uid)
		}
	}
	mu.Unlock()
	close(c.ch)
}

func computeUnread(uid int) int64 {
	// fetch minimal user info for audience filter evaluation
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
	var total int64
	model.DB.Raw(`SELECT COUNT(*) FROM messages m LEFT JOIN message_reads r ON m.id=r.message_id AND r.user_id=?
        WHERE r.id IS NULL AND (m.receiver_id=? OR (m.receiver_id=0 AND (m.audience='all' OR m.audience='' OR (m.audience='new' AND ?) OR (m.audience='active' AND ?))))`, uid, uid, newUser, activeUser).Scan(&total)
	return total
}

// computeUnreadCached caches unread counts for 3 seconds (micro-throttle)
func computeUnreadCached(uid int) int64 {
	const ttl = 3 * time.Second
	unreadCache.RLock()
	entry, ok := unreadCache.m[uid]
	if ok && time.Since(entry.Ts) < ttl {
		unreadCache.RUnlock()
		return entry.Count
	}
	unreadCache.RUnlock()
	count := computeUnread(uid)
	unreadCache.Lock()
	unreadCache.m[uid] = struct {
		Count int64
		Ts    time.Time
	}{Count: count, Ts: time.Now()}
	unreadCache.Unlock()
	return count
}

func pushEvent(uid int, event string, payload any) { pushEventWithID(uid, event, payload, "") }

func pushEventWithID(uid int, event string, payload any, idLine string) {
	data, _ := json.Marshal(payload)
	msg := ""
	if idLine != "" {
		msg += "id: " + idLine + "\n"
	}
	msg += "event: " + event + "\n" + "data: " + string(data) + "\n\n"
	mu.RLock()
	if set, ok := clients[uid]; ok {
		for c := range set {
			select {
			case c.ch <- msg:
			default:
			}
		}
	}
	mu.RUnlock()
}

func pushUnread(uid int) {
	pushEvent(uid, "unread", map[string]int64{"unread": computeUnreadCached(uid)})
}

// PushUnread exported for controllers to trigger unread recomputation without fake message event.
func PushUnread(uid int) { pushUnread(uid) }

// PushMessageToUser pushes message and unread update.
func PushMessageToUser(uid int, msg *model.Message) {
	pushEventWithID(uid, "message", map[string]any{
		"id":           msg.Id,
		"sender_id":    msg.SenderId,
		"receiver_id":  msg.ReceiverId,
		"subject":      msg.Subject,
		"content":      msg.Content,
		"reply_to":     msg.ReplyTo,
		"created_at":   msg.CreatedAt.Format("2006-01-02 15:04:05"),
		"is_broadcast": msg.ReceiverId == 0,
	}, strconv.Itoa(msg.Id))
	pushUnread(uid)
}

// BroadcastMessage pushes a broadcast to all connected users.
func BroadcastMessage(msg *model.Message) {
	// publish through redis if available for multi-instance fanout
	if common.RedisEnabled && common.RDB != nil {
		payload, _ := json.Marshal(map[string]any{"type": "message", "message": map[string]any{
			"id":           msg.Id,
			"sender_id":    msg.SenderId,
			"receiver_id":  msg.ReceiverId,
			"subject":      msg.Subject,
			"content":      msg.Content,
			"reply_to":     msg.ReplyTo,
			"created_at":   msg.CreatedAt.Format("2006-01-02 15:04:05"),
			"is_broadcast": true,
		}})
		common.RDB.Publish(context.Background(), "sse_broadcast", string(payload))
	}
	mu.RLock()
	users := make([]int, 0, len(clients))
	for uid := range clients {
		users = append(users, uid)
	}
	mu.RUnlock()
	for _, uid := range users {
		PushMessageToUser(uid, msg)
	}
}

// BroadcastUnread recomputes unread for all online users.
func BroadcastUnread() {
	if common.RedisEnabled && common.RDB != nil {
		payload, _ := json.Marshal(map[string]any{"type": "unread_all"})
		common.RDB.Publish(context.Background(), "sse_broadcast", string(payload))
	}
	mu.RLock()
	users := make([]int, 0, len(clients))
	for uid := range clients {
		users = append(users, uid)
	}
	mu.RUnlock()
	for _, uid := range users {
		pushUnread(uid)
	}
}

// BroadcastRarePrize 向所有在线用户广播稀有奖品掉落事件（简要信息）。
// rarity: prize rarity enum; prizeName: 名称；username: 获奖用户显示名或匿名（调用端决定）。
func BroadcastRarePrize(rarity, prizeName, username string) {
	payload := map[string]any{
		"rarity":     rarity,
		"prize_name": prizeName,
		"user":       username,
		"ts":         time.Now().Unix(),
	}
	// Redis 互通
	if common.RedisEnabled && common.RDB != nil {
		env := map[string]any{"type": "lottery_rare", "data": payload}
		b, _ := json.Marshal(env)
		common.RDB.Publish(context.Background(), "sse_broadcast", string(b))
	}
	// 本地在线用户广播
	mu.RLock()
	users := make([]int, 0, len(clients))
	for uid := range clients {
		users = append(users, uid)
	}
	mu.RUnlock()
	for _, u := range users {
		pushEvent(u, "lottery_rare", payload)
	}
}

// InvalidateUnread invalidates cache for one user (exported for controllers)
func InvalidateUnread(uid int) {
	unreadCache.Lock()
	delete(unreadCache.m, uid)
	unreadCache.Unlock()
}

// InvalidateAllUnread clears entire unread cache
func InvalidateAllUnread() {
	unreadCache.Lock()
	unreadCache.m = map[int]struct {
		Count int64
		Ts    time.Time
	}{}
	unreadCache.Unlock()
}

// ServeSSE serves the SSE stream for a user.
func ServeSSE(w http.ResponseWriter, r *http.Request, uid int) {
	// initialize redis subscription once (lazy) if enabled
	if common.RedisEnabled && common.RDB != nil {
		redisPubSubOnce.Do(func() {
			go func() {
				sub := common.RDB.Subscribe(context.Background(), "sse_broadcast")
				ch := sub.Channel()
				for msg := range ch {
					var envelope map[string]any
					if err := json.Unmarshal([]byte(msg.Payload), &envelope); err != nil {
						continue
					}
					t, _ := envelope["type"].(string)
					switch t {
					case "message":
						if mraw, ok := envelope["message"].(map[string]any); ok {
							// fanout to local clients (reuse structure)
							data, _ := json.Marshal(mraw)
							// broadcast only (receiver_id=0)
							mu.RLock()
							users := make([]int, 0, len(clients))
							for uid := range clients {
								users = append(users, uid)
							}
							mu.RUnlock()
							for _, u := range users {
								pushEvent(u, "message", json.RawMessage(data))
								InvalidateUnread(u)
							}
							for _, u := range users {
								pushUnread(u)
							}
						}
					case "unread_all":
						mu.RLock()
						users := make([]int, 0, len(clients))
						for uid := range clients {
							users = append(users, uid)
						}
						mu.RUnlock()
						for _, u := range users {
							InvalidateUnread(u)
							pushUnread(u)
						}
					case "lottery_rare":
						if data, ok := envelope["data"].(map[string]any); ok {
							mu.RLock()
							users := make([]int, 0, len(clients))
							for uid := range clients {
								users = append(users, uid)
							}
							mu.RUnlock()
							for _, u := range users {
								pushEvent(u, "lottery_rare", data)
							}
						}
					}
				}
			}()
		})
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flusher, ok := w.(http.Flusher)
	if !ok {
		return
	}
	c := register(uid)
	defer remove(c)
	pushUnread(uid)
	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()
	notify := r.Context().Done()
	// backlog replay if Last-Event-ID provided (only for message events)
	lastEventID := r.Header.Get("Last-Event-ID")
	if lastEventID != "" {
		if lid, err := strconv.Atoi(lastEventID); err == nil && lid > 0 {
			// fetch user audience flags
			var user model.User
			_ = model.DB.Select("created_at,last_login_at").First(&user, uid).Error
			now := time.Now()
			newUser := user.CreatedAt.After(now.Add(-7 * 24 * time.Hour))
			activeUser := false
			if user.LastLoginAt != nil && *user.LastLoginAt >= now.Add(-30*24*time.Hour).Unix() {
				activeUser = true
			}
			br := []string{"(audience='' OR audience='all'"}
			if newUser {
				br = append(br, "audience='new'")
			}
			if activeUser {
				br = append(br, "audience='active'")
			}
			cond := br[0]
			for i := 1; i < len(br); i++ {
				cond += " OR " + br[i]
			}
			cond += ")"
			// query missed messages (limit 100)
			var missed []model.Message
			model.DB.Where("id > ? AND (receiver_id=? OR (receiver_id=0 AND "+cond+"))", lid, uid).Order("id ASC").Limit(100).Find(&missed)
			for _, m := range missed {
				pushEventWithID(uid, "message", map[string]any{
					"id":           m.Id,
					"sender_id":    m.SenderId,
					"receiver_id":  m.ReceiverId,
					"subject":      m.Subject,
					"content":      m.Content,
					"reply_to":     m.ReplyTo,
					"created_at":   m.CreatedAt.Format("2006-01-02 15:04:05"),
					"is_broadcast": m.ReceiverId == 0,
				}, strconv.Itoa(m.Id))
			}
		}
	}
	for {
		select {
		case <-notify:
			return
		case <-ticker.C:
			_, _ = w.Write([]byte(": ping\n\n"))
			flusher.Flush()
		case msg, ok := <-c.ch:
			if !ok {
				return
			}
			_, _ = w.Write([]byte(msg))
			flusher.Flush()
		}
	}
}
