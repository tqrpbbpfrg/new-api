package common

import (
	"encoding/json"
	"net/http"
	"one-api/model"
	"sync"
	"time"
)

// Simple in-memory SSE hub. For larger scale replace with Redis pub/sub.
type sseClient struct {
	uid int
	ch  chan string
}

var (
	sseMu      sync.RWMutex
	sseClients = map[int]map[*sseClient]struct{}{}
)

func registerSSE(uid int) *sseClient {
	c := &sseClient{uid: uid, ch: make(chan string, 16)}
	sseMu.Lock()
	if sseClients[uid] == nil {
		sseClients[uid] = map[*sseClient]struct{}{}
	}
	sseClients[uid][c] = struct{}{}
	sseMu.Unlock()
	return c
}

func removeSSE(c *sseClient) {
	sseMu.Lock()
	set := sseClients[c.uid]
	if set != nil {
		delete(set, c)
		if len(set) == 0 {
			delete(sseClients, c.uid)
		}
	}
	sseMu.Unlock()
	close(c.ch)
}

func computeUnread(uid int) int64 {
	var total int64
	model.DB.Raw(`SELECT COUNT(*) FROM messages m LEFT JOIN message_reads r ON m.id=r.message_id AND r.user_id=? WHERE (m.receiver_id=? OR m.receiver_id=0) AND r.id IS NULL`, uid, uid).Scan(&total)
	return total
}

func pushEvent(uid int, event string, payload any) {
	data, _ := json.Marshal(payload)
	msg := "event: " + event + "\n" + "data: " + string(data) + "\n\n"
	sseMu.RLock()
	if set, ok := sseClients[uid]; ok {
		for c := range set {
			select {
			case c.ch <- msg:
			default:
			}
		}
	}
	sseMu.RUnlock()
}

func pushUnread(uid int) { pushEvent(uid, "unread", map[string]int64{"unread": computeUnread(uid)}) }

// PushMessageToUser pushes a single message event & unread update.
func PushMessageToUser(uid int, msg *model.Message) {
	pushEvent(uid, "message", map[string]any{
		"id":           msg.Id,
		"sender_id":    msg.SenderId,
		"receiver_id":  msg.ReceiverId,
		"subject":      msg.Subject,
		"content":      msg.Content,
		"reply_to":     msg.ReplyTo,
		"created_at":   msg.CreatedAt.Format("2006-01-02 15:04:05"),
		"is_broadcast": msg.ReceiverId == 0,
	})
	pushUnread(uid)
}

// BroadcastMessage broadcasts a message to all connected users (used for receiver_id=0).
func BroadcastMessage(msg *model.Message) {
	sseMu.RLock()
	users := make([]int, 0, len(sseClients))
	for uid := range sseClients {
		users = append(users, uid)
	}
	sseMu.RUnlock()
	for _, uid := range users {
		PushMessageToUser(uid, msg)
	}
}

// BroadcastUnread recomputes unread for all connected users.
func BroadcastUnread() {
	sseMu.RLock()
	users := make([]int, 0, len(sseClients))
	for uid := range sseClients {
		users = append(users, uid)
	}
	sseMu.RUnlock()
	for _, uid := range users {
		pushUnread(uid)
	}
}

// ServeSSE serves SSE for a user.
func ServeSSE(w http.ResponseWriter, r *http.Request, uid int) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flusher, ok := w.(http.Flusher)
	if !ok {
		return
	}
	client := registerSSE(uid)
	defer removeSSE(client)
	// initial unread push
	pushUnread(uid)
	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()
	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case <-ticker.C:
			_, _ = w.Write([]byte(": ping\n\n"))
			flusher.Flush()
		case msg, ok := <-client.ch:
			if !ok {
				return
			}
			_, _ = w.Write([]byte(msg))
			flusher.Flush()
		}
	}
}
