package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// 一个非常轻量的用户级本地限速（令牌桶/滑动窗口简化版）
// 目的：防止有人在短时间内对抽奖接口进行高频请求导致库存竞争
// 默认配置：5 requests / 3s per user

type bucket struct {
	last   time.Time
	tokens int
}

var (
	lotteryLimiter  sync.Map // userID -> *bucket
	lotteryCapacity = 5
	lotteryRefill   = 5
	lotteryWindow   = 3 * time.Second
)

func LotteryRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid := c.GetInt("id")
		if uid == 0 {
			c.Next()
			return
		}
		now := time.Now()
		val, _ := lotteryLimiter.LoadOrStore(uid, &bucket{last: now, tokens: lotteryCapacity})
		b := val.(*bucket)
		// 粗略锁（无需细粒度性能）
		// 这里使用互斥避免竞态
		var mu sync.Mutex
		mu.Lock()
		defer mu.Unlock()
		if since := now.Sub(b.last); since > lotteryWindow {
			// refill
			b.tokens = lotteryCapacity
			b.last = now
		}
		if b.tokens <= 0 {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "请求过于频繁，请稍后再试"})
			c.Abort()
			return
		}
		b.tokens--
		c.Next()
	}
}
