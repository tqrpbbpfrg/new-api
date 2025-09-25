package router

import (
	"embed"
	"fmt"
	"net/http"
	"one-api/common"
	"os"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/gin-gonic/gin"
)

func SetRouter(router *gin.Engine, buildFS embed.FS, indexPage []byte) {
	SetApiRouter(router)
	SetDashboardRouter(router)
	SetRelayRouter(router)
	SetVideoRouter(router)

	// Prometheus metrics (lazy init - avoid import cycles earlier than router setup)
	reg := prometheus.NewRegistry()
	if common.DiscordOAuthCounter == nil {
		common.DiscordOAuthCounter = prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "discord_oauth_total",
			Help: "Discord OAuth attempts classified by action & result",
		}, []string{"action", "result"})
		reg.MustRegister(common.DiscordOAuthCounter)
	}
	if common.DiscordOAuthLatency == nil {
		common.DiscordOAuthLatency = prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "discord_oauth_step_seconds",
			Help:    "Latency of each Discord OAuth external step",
			Buckets: []float64{0.1, 0.25, 0.5, 1, 2, 3, 5},
		}, []string{"action", "step", "result"})
		reg.MustRegister(common.DiscordOAuthLatency)
	}
	// add process uptime gauge
	uptimeGauge := prometheus.NewGaugeFunc(prometheus.GaugeOpts{Name: "process_uptime_seconds", Help: "Process uptime in seconds"}, func() float64 {
		return time.Since(time.Unix(common.StartTime, 0)).Seconds()
	})
	reg.MustRegister(uptimeGauge)

	router.GET("/metrics", gin.WrapH(promhttp.HandlerFor(reg, promhttp.HandlerOpts{})))
	frontendBaseUrl := os.Getenv("FRONTEND_BASE_URL")
	if common.IsMasterNode && frontendBaseUrl != "" {
		frontendBaseUrl = ""
		common.SysLog("FRONTEND_BASE_URL is ignored on master node")
	}
	if frontendBaseUrl == "" {
		SetWebRouter(router, buildFS, indexPage)
	} else {
		frontendBaseUrl = strings.TrimSuffix(frontendBaseUrl, "/")
		router.NoRoute(func(c *gin.Context) {
			c.Redirect(http.StatusMovedPermanently, fmt.Sprintf("%s%s", frontendBaseUrl, c.Request.RequestURI))
		})
	}
}
