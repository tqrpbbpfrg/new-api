package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"one-api/common"
	"one-api/model"
	"one-api/setting/system_setting"
	"regexp"
	"strings"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

// Discord OAuth reference: https://discord.com/developers/docs/topics/oauth2
// We only need minimal user info (id, username, global_name / email)
type discordOAuthResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

type discordUser struct {
	Id         string `json:"id"`
	Username   string `json:"username"`
	GlobalName string `json:"global_name"`
	Email      string `json:"email"`
	Avatar     string `json:"avatar"`
}

func getDiscordUserInfoByCode(action string, code string) (*discordUser, error) {
	if code == "" {
		return nil, errors.New("无效的参数")
	}
	if common.DiscordClientId == "" || common.DiscordClientSecret == "" {
		return nil, errors.New("服务器未配置 Discord OAuth 参数")
	}
	redirectBase := system_setting.ServerAddress
	if redirectBase == "" {
		// 回退使用 OptionMap（兼容旧逻辑），再不行只能提示
		redirectBase = common.OptionMap["ServerAddress"]
	}
	if redirectBase == "" {
		return nil, errors.New("未配置 ServerAddress，无法完成 Discord 回调")
	}
	redirectURI := fmt.Sprintf("%s/oauth/discord", strings.TrimRight(redirectBase, "/"))

	form := url.Values{}
	form.Set("client_id", common.DiscordClientId)
	form.Set("client_secret", common.DiscordClientSecret)
	form.Set("code", code)
	form.Set("grant_type", "authorization_code")
	form.Set("redirect_uri", redirectURI)
	// Scope 不在 token 请求里重新给（Discord 官方允许，但我们主要在 authorize 阶段传），留空即可

	req, err := http.NewRequest("POST", "https://discord.com/api/oauth2/token", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "new-api-discord-oauth/1.0")
	client := http.Client{Timeout: 5 * time.Second}
	startToken := time.Now()
	res, err := client.Do(req)
	if err != nil {
		common.SysLog(err.Error())
		return nil, errors.New("无法连接至 Discord 服务器，请稍后重试！")
	}
	defer res.Body.Close()
	tokenResult := "success"
	if res.StatusCode != http.StatusOK {
		tokenResult = "failure"
		return nil, fmt.Errorf("Discord token 请求失败: %s", res.Status)
	}
	if common.DiscordOAuthLatency != nil {
		common.DiscordOAuthLatency.WithLabelValues(action, "token", tokenResult).Observe(time.Since(startToken).Seconds())
	}
	var oAuthResp discordOAuthResponse
	if err = json.NewDecoder(res.Body).Decode(&oAuthResp); err != nil {
		return nil, err
	}
	if oAuthResp.AccessToken == "" {
		return nil, errors.New("Discord 授权失败，请稍后重试！")
	}

	req, err = http.NewRequest("GET", "https://discord.com/api/users/@me", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", oAuthResp.AccessToken))
	req.Header.Set("User-Agent", "new-api-discord-oauth/1.0")
	startUser := time.Now()
	res2, err := client.Do(req)
	if err != nil {
		common.SysLog(err.Error())
		return nil, errors.New("无法连接至 Discord 服务器，请稍后重试！")
	}
	defer res2.Body.Close()
	userResult := "success"
	if res2.StatusCode != http.StatusOK {
		userResult = "failure"
		return nil, fmt.Errorf("Discord 用户信息获取失败: %s", res2.Status)
	}
	if common.DiscordOAuthLatency != nil {
		common.DiscordOAuthLatency.WithLabelValues(action, "user", userResult).Observe(time.Since(startUser).Seconds())
	}
	var dUser discordUser
	if err = json.NewDecoder(res2.Body).Decode(&dUser); err != nil {
		return nil, err
	}
	if dUser.Id == "" {
		return nil, errors.New("返回值非法，用户字段为空，请稍后重试！")
	}
	return &dUser, nil
}

func DiscordOAuth(c *gin.Context) {
	session := sessions.Default(c)
	state := c.Query("state")
	if state == "" || session.Get("oauth_state") == nil || state != session.Get("oauth_state").(string) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "非法或过期的 OAuth 状态，请刷新后重试"})
		return
	}
	// 单次使用 state，防重放
	session.Delete("oauth_state")
	_ = session.Save()
	if session.Get("username") != nil {
		DiscordBind(c)
		return
	}
	if !common.DiscordOAuthEnabled {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "管理员未开启通过 Discord 登录以及注册"})
		return
	}
	code := c.Query("code")
	dUser, err := getDiscordUserInfoByCode("login", code)
	if err != nil {
		if common.DiscordOAuthCounter != nil {
			common.DiscordOAuthCounter.WithLabelValues("login", "failure").Inc()
		}
		common.ApiError(c, err)
		return
	}
	user := model.User{DiscordId: dUser.Id}
	if model.IsDiscordIdAlreadyTaken(user.DiscordId) {
		if err := user.FillUserByDiscordId(); err != nil {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
			return
		}
		if user.Id == 0 { // deleted
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "用户已注销"})
			return
		}
	} else {
		if common.RegisterEnabled {
			// 按用户要求：直接以 Discord 原始用户名为初始用户名；若已存在则附加递增后缀
			baseUsername := dUser.Username
			// 过滤用户名：仅保留字母数字下划线中横线点
			sanitizer := regexp.MustCompile(`[^a-zA-Z0-9._-]`)
			baseUsername = sanitizer.ReplaceAllString(baseUsername, "_")
			if len(baseUsername) > 12 { // align with validation tag
				baseUsername = baseUsername[:12]
			}
			if baseUsername == "" { // 兜底
				baseUsername = "discord_user"
			}
			finalUsername := baseUsername
			tryIdx := 1
			for {
				exist, _ := model.CheckUserExistOrDeleted(finalUsername, "")
				if !exist {
					break
				}
				tryIdx++
				finalUsername = fmt.Sprintf("%s_%d", baseUsername, tryIdx)
				if tryIdx > 50 { // 防止极端循环
					finalUsername = fmt.Sprintf("discord_%d", model.GetMaxUserId()+1)
					break
				}
			}
			user.Username = finalUsername
			if dUser.GlobalName != "" {
				user.DisplayName = dUser.GlobalName
			} else {
				user.DisplayName = baseUsername
			}
			user.Email = dUser.Email
			// 头像构造：参考 Discord CDN 规则
			if dUser.Avatar != "" {
				user.DiscordAvatar = fmt.Sprintf("https://cdn.discordapp.com/avatars/%s/%s.png", dUser.Id, dUser.Avatar)
			}
			user.Role = common.RoleCommonUser
			user.Status = common.UserStatusEnabled
			affCode := session.Get("aff")
			inviterId := 0
			if affCode != nil {
				inviterId, _ = model.GetUserIdByAffCode(affCode.(string))
			}
			if err := user.Insert(inviterId); err != nil {
				c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
				return
			}
		} else {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": "管理员关闭了新用户注册"})
			return
		}
	}
	if user.Status != common.UserStatusEnabled {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "用户已被封禁"})
		return
	}
	// 如果已有用户但未存头像，可尝试补写（只做一次，不阻塞）
	if user.DiscordAvatar == "" && dUser.Avatar != "" {
		go func(uid int, du discordUser) {
			_user := model.User{Id: uid}
			if err := _user.FillUserById(); err == nil && _user.DiscordAvatar == "" {
				_user.DiscordAvatar = fmt.Sprintf("https://cdn.discordapp.com/avatars/%s/%s.png", du.Id, du.Avatar)
				_user.Update(false)
			}
		}(user.Id, *dUser)
	}
	if common.DiscordOAuthCounter != nil {
		common.DiscordOAuthCounter.WithLabelValues("login", "success").Inc()
	}
	setupLogin(&user, c)
}

func DiscordBind(c *gin.Context) {
	if !common.DiscordOAuthEnabled {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "管理员未开启通过 Discord 登录以及注册"})
		return
	}
	code := c.Query("code")
	dUser, err := getDiscordUserInfoByCode("bind", code)
	if err != nil {
		if common.DiscordOAuthCounter != nil {
			common.DiscordOAuthCounter.WithLabelValues("bind", "failure").Inc()
		}
		common.ApiError(c, err)
		return
	}
	if model.IsDiscordIdAlreadyTaken(dUser.Id) {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "该 Discord 账户已被绑定"})
		return
	}
	session := sessions.Default(c)
	id := session.Get("id")
	user := model.User{Id: id.(int)}
	if err = user.FillUserById(); err != nil {
		common.ApiError(c, err)
		return
	}
	user.DiscordId = dUser.Id
	// 写头像
	if dUser.Avatar != "" {
		user.DiscordAvatar = fmt.Sprintf("https://cdn.discordapp.com/avatars/%s/%s.png", dUser.Id, dUser.Avatar)
	}
	if err = user.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}
	if common.DiscordOAuthCounter != nil {
		common.DiscordOAuthCounter.WithLabelValues("bind", "success").Inc()
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "bind"})
}
