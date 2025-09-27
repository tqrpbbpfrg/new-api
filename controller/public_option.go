package controller

/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import (
	"net/http"
	"one-api/common"
	"one-api/setting/operation_setting"
	"one-api/setting/system_setting"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func GetPublicOptions(c *gin.Context) {
	whiteList := map[string]struct{}{
		// 功能开关
		"CheckinEnabled":           {},
		"LotteryEnabled":           {},
		"DisplayInCurrencyEnabled": {},
		"DisplayTokenStatEnabled":  {},
		"DefaultCollapseSidebar":   {},
		"DemoSiteEnabled":          {},
		"SelfUseModeEnabled":       {},
		"EmailVerificationEnabled": {},
		"UIBlurGlassEnabled":       {},
		// OAuth 公开（仅非敏感标识，用于前端显示按钮；不包含 Secret）
		"GitHubOAuthEnabled":   {},
		"GitHubClientId":       {},
		"DiscordOAuthEnabled":  {},
		"DiscordClientId":      {},
		"DiscordOAuthScopes":   {},
		"TelegramOAuthEnabled": {},
		"TelegramBotName":      {},
		"LinuxDOOAuthEnabled":  {},
		"LinuxDOClientId":      {},
		"WeChatAuthEnabled":    {},
		"WeChatAccountQRCodeImageURL": {},
		"OIDCEnabled":                {},
		"OIDCClientId":               {},
		"OIDCAuthorizationEndpoint":  {},
		// UI 外观
		"UIBlurGlassStrength": {},
		"UIBlurGlassArea":     {},
		// 签到 & 抽奖
		"CheckinMinReward":   {},
		"CheckinMaxReward":   {},
		"CheckinStreakBonus": {},
		// 基础数值
		"QuotaPerUnit":    {},
		"Price":           {},
		"USDExchangeRate": {},
		// 品牌 / 文案
		"SystemName": {},
		"Logo":       {},
		"Footer":     {},
		// 其他前端初始化需要的公共开关
		"TurnstileCheckEnabled": {},
		"TurnstileSiteKey":      {},
	}

	result := make(map[string]any)
	common.OptionMapRWMutex.RLock()
	for k, v := range common.OptionMap {
		if _, ok := whiteList[k]; !ok {
			continue
		}
		// 保护：再次过滤潜在敏感后缀（理论上白名单已排除）
		lower := strings.ToLower(k)
		if strings.HasSuffix(lower, "token") || strings.HasSuffix(lower, "secret") || strings.HasSuffix(lower, "key") {
			continue
		}
		// 类型化：bool
		if v == "true" || v == "false" {
			result[k] = (v == "true")
			continue
		}
		// int
		if iv, err := strconv.Atoi(v); err == nil {
			result[k] = iv
			continue
		}
		// float
		if fv, err := strconv.ParseFloat(v, 64); err == nil {
			result[k] = fv
			continue
		}
		// 其他：原样字符串
		result[k] = v
	}
	common.OptionMapRWMutex.RUnlock()

	// 注入不在 OptionMap 中、但需要公开的派生配置（OIDC、微信二维码 等）
	if system_setting.GetOIDCSettings().Enabled {
		result["OIDCEnabled"] = true
		result["OIDCClientId"] = system_setting.GetOIDCSettings().ClientId
		result["OIDCAuthorizationEndpoint"] = system_setting.GetOIDCSettings().AuthorizationEndpoint
	}
	if common.WeChatAccountQRCodeImageURL != "" {
		result["WeChatAccountQRCodeImageURL"] = common.WeChatAccountQRCodeImageURL
	}
	// 运营模式/自用模式、邮件验证、演示站等（若未在 OptionMap 中则从运行时变量注入）
	if _, ok := result["SelfUseModeEnabled"]; !ok {
		result["SelfUseModeEnabled"] = operation_setting.SelfUseModeEnabled
	}
	if _, ok := result["EmailVerificationEnabled"]; !ok {
		result["EmailVerificationEnabled"] = common.EmailVerificationEnabled
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    result,
	})
}
// END GetPublicOptions
