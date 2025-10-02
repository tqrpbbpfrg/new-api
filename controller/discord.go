package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"one-api/common"
	"one-api/model"
	"one-api/setting"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type DiscordTokenResponse struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
	TokenType    string `json:"token_type"`
}

type DiscordUserResponse struct {
	ID            string  `json:"id"`
	Username      string  `json:"username"`
	Avatar        string  `json:"avatar"`
	Discriminator string  `json:"discriminator"`
	Email         string  `json:"email"`
	Verified      bool    `json:"verified"`
	Locale        string  `json:"locale"`
	MFAEnabled    bool    `json:"mfa_enabled"`
	PremiumType   int     `json:"premium_type"`
	PublicFlags   int     `json:"public_flags"`
	Flags         int     `json:"flags"`
	Banner        *string `json:"banner"`
	AccentColor   *int    `json:"accent_color"`
	GlobalName    string  `json:"global_name"`
}

type DiscordGuildMember struct {
	User         DiscordUserResponse `json:"user"`
	Nick         string              `json:"nick"`
	Avatar       *string             `json:"avatar"`
	Roles        []string            `json:"roles"`
	JoinedAt     string              `json:"joined_at"`
	PremiumSince *string             `json:"premium_since"`
	Deaf         bool                `json:"deaf"`
	Mute         bool                `json:"mute"`
	Pending      bool                `json:"pending"`
}

func getDiscordUserInfoByCode(code string, c *gin.Context) (*DiscordUserResponse, *[]DiscordGuildMember, error) {
	if code == "" {
		return nil, nil, errors.New("无效的参数")
	}

	// 交换授权码获取访问令牌
	values := url.Values{}
	values.Set("client_id", common.DiscordClientId)
	values.Set("client_secret", common.DiscordClientSecret)
	values.Set("code", code)
	values.Set("grant_type", "authorization_code")

	// 使用与前端一致的redirect_uri构建方式
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	redirectURI := fmt.Sprintf("%s://%s/oauth/discord", scheme, c.Request.Host)
	values.Set("redirect_uri", redirectURI)
	formData := values.Encode()

	req, err := http.NewRequest("POST", "https://discord.com/api/oauth2/token", strings.NewReader(formData))
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")
	client := http.Client{
		Timeout: 10 * time.Second,
	}
	res, err := client.Do(req)
	if err != nil {
		common.SysLog(err.Error())
		return nil, nil, errors.New("无法连接至 Discord 服务器，请稍后重试")
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		common.SysLog(fmt.Sprintf("Discord 授权失败: %d", res.StatusCode))
		return nil, nil, errors.New("discord 授权失败，请检查配置")
	}

	var tokenResponse DiscordTokenResponse
	err = json.NewDecoder(res.Body).Decode(&tokenResponse)
	if err != nil {
		return nil, nil, err
	}

	if tokenResponse.AccessToken == "" {
		common.SysLog("Discord 获取 Token 失败，请检查设置！")
		return nil, nil, errors.New("discord 获取 token 失败，请检查设置！")
	}

	// 获取用户信息
	userReq, err := http.NewRequest("GET", "https://discord.com/api/users/@me", nil)
	if err != nil {
		return nil, nil, err
	}
	userReq.Header.Set("Authorization", fmt.Sprintf("%s %s", tokenResponse.TokenType, tokenResponse.AccessToken))
	userRes, err := client.Do(userReq)
	if err != nil {
		common.SysLog(err.Error())
		return nil, nil, errors.New("无法连接至 Discord 服务器，请稍后重试")
	}
	defer userRes.Body.Close()

	if userRes.StatusCode != http.StatusOK {
		common.SysLog(fmt.Sprintf("Discord 获取用户信息失败: %d", userRes.StatusCode))
		return nil, nil, errors.New("discord 获取用户信息失败")
	}

	var userResponse DiscordUserResponse
	err = json.NewDecoder(userRes.Body).Decode(&userResponse)
	if err != nil {
		return nil, nil, err
	}

	// 如果需要检查用户是否加入指定服务器
	var guildMembers *[]DiscordGuildMember = nil
	if common.DiscordRequireGuild && common.DiscordGuildId != "" {
		guildReq, err := http.NewRequest("GET", fmt.Sprintf("https://discord.com/api/users/@me/guilds/%s/member", common.DiscordGuildId), nil)
		if err != nil {
			return nil, nil, err
		}
		guildReq.Header.Set("Authorization", fmt.Sprintf("%s %s", tokenResponse.TokenType, tokenResponse.AccessToken))
		guildRes, err := client.Do(guildReq)

		if err != nil {
			common.SysLog(err.Error())
			// 如果获取服务器信息失败，但不是必需的，继续处理
			if !common.DiscordRequireGuild {
				return &userResponse, nil, nil
			}
			return nil, nil, errors.New("无法获取 Discord 服务器信息，请稍后重试")
		}
		defer guildRes.Body.Close()

		if guildRes.StatusCode == http.StatusOK {
			var guildMember DiscordGuildMember
			err = json.NewDecoder(guildRes.Body).Decode(&guildMember)
			if err != nil {
				// 解析失败但不是必需的，继续处理
				if !common.DiscordRequireGuild {
					return &userResponse, nil, nil
				}
				return nil, nil, err
			}
			members := []DiscordGuildMember{guildMember}
			guildMembers = &members
		} else if common.DiscordRequireGuild {
			// 如果需要服务器验证但没有加入服务器
			common.SysLog(fmt.Sprintf("用户未加入指定的 Discord 服务器: %s", userResponse.Username))
			return nil, nil, errors.New("您需要加入指定的 Discord 服务器才能继续")
		}
	}

	return &userResponse, guildMembers, nil
}

func DiscordAuth(c *gin.Context) {
	session := sessions.Default(c)
	state := c.Query("state")
	sessionState := session.Get("oauth_state")

	// 简化状态验证，与GitHub/LinuxDO保持一致
	if state == "" || sessionState == nil || state != sessionState.(string) {
		common.SysLog(fmt.Sprintf("Discord OAuth 状态验证失败: state=%s, session_state=%v", state, sessionState))
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "Discord 授权状态验证失败，请重新尝试登录",
		})
		return
	}

	username := session.Get("username")
	if username != nil {
		DiscordBind(c)
		return
	}
	if !common.DiscordOAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "管理员未开启通过 Discord 登录以及注册",
		})
		return
	}
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Discord 授权码为空，请重新授权",
		})
		return
	}
	discordUser, guildMembers, err := getDiscordUserInfoByCode(code, c)
	if err != nil {
		common.SysLog(fmt.Sprintf("Discord OAuth 获取用户信息失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("Discord 授权失败: %s", err.Error()),
		})
		return
	}

	// 验证是否需要检查服务器成员资格（登录和注册都需要检查）
	if common.DiscordRequireGuild && common.DiscordGuildId != "" {
		if guildMembers == nil || len(*guildMembers) == 0 {
			common.SysLog(fmt.Sprintf("Discord OAuth 用户未加入指定服务器: DiscordID=%s, Username=%s, GlobalName=%s", 
				discordUser.ID, discordUser.Username, discordUser.GlobalName))
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": fmt.Sprintf("您需要加入指定的 Discord 服务器才能登录。Discord用户: %s", 
					func() string {
						if discordUser.GlobalName != "" {
							return discordUser.GlobalName
						}
						return discordUser.Username
					}()),
			})
			return
		}
		common.SysLog(fmt.Sprintf("Discord OAuth 用户已加入指定服务器: DiscordID=%s, Username=%s, GlobalName=%s", 
			discordUser.ID, discordUser.Username, discordUser.GlobalName))
	}
	user := model.User{
		DiscordId: discordUser.ID,
	}

	// 检查用户是否已存在
	if model.IsDiscordIdAlreadyTaken(user.DiscordId) {
		// 填充已存在的用户信息
		err := user.FillUserByDiscordId()
		if err != nil {
			common.SysLog(fmt.Sprintf("Discord OAuth 填充用户信息失败: %v", err))
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "用户信息获取失败，请联系管理员",
			})
			return
		}
		// 检查用户是否被删除
		if user.Id == 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "用户已注销",
			})
			return
		}
	} else {
		// 创建新用户
		if !common.RegisterEnabled {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "管理员关闭了新用户注册",
			})
			return
		}

		// 设置用户基本信息
		user.Email = discordUser.Email
		if discordUser.GlobalName != "" {
			user.DisplayName = discordUser.GlobalName
		} else {
			user.DisplayName = discordUser.Username
		}
		user.Username = "discord_" + strconv.Itoa(model.GetMaxUserId()+1)
		user.Role = common.RoleCommonUser
		user.Status = common.UserStatusEnabled

		// 根据注册方式设置默认用户组
		user.Group = setting.GetDefaultUserGroupForMethod("discord")

		// 创建用户
		err := user.Insert(0)
		if err != nil {
			common.SysLog(fmt.Sprintf("Discord OAuth 创建用户失败: %v", err))
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": fmt.Sprintf("用户创建失败: %s", err.Error()),
			})
			return
		}
	}

	if user.Status != common.UserStatusEnabled {
		c.JSON(http.StatusOK, gin.H{
			"message": "用户已被封禁",
			"success": false,
		})
		return
	}

	// 清理 OAuth state，防止重复使用
	session.Delete("oauth_state")
	session.Delete("oauth_state_time")
	err = session.Save()
	if err != nil {
		common.SysLog(fmt.Sprintf("Discord OAuth 保存会话失败: %v", err))
	}

	setupLogin(&user, c)
}

func DiscordOAuth(c *gin.Context) {
	DiscordAuth(c)
}

func DiscordBind(c *gin.Context) {
	if !common.DiscordOAuthEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "管理员未开启通过 Discord 登录以及注册",
		})
		return
	}

	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Discord 授权码为空",
		})
		return
	}

	discordUser, _, err := getDiscordUserInfoByCode(code, c)
	if err != nil {
		common.SysLog(fmt.Sprintf("Discord Bind 获取用户信息失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("Discord 授权失败: %s", err.Error()),
		})
		return
	}

	// 检查Discord账户是否已被其他用户绑定
	if model.IsDiscordIdAlreadyTaken(discordUser.ID) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "该 Discord 账户已被其他用户绑定",
		})
		return
	}

	session := sessions.Default(c)
	id := session.Get("id")
	if id == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "用户未登录",
		})
		return
	}

	user := model.User{Id: id.(int)}
	err = user.FillUserById()
	if err != nil {
		common.SysLog(fmt.Sprintf("Discord Bind 获取用户信息失败: %v", err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "用户信息获取失败",
		})
		return
	}

	// 添加详细日志：更新前
	common.SysLog(fmt.Sprintf("Discord Bind: 准备更新用户 ID=%d, Username=%s, 绑定 Discord ID=%s", user.Id, user.Username, discordUser.ID))
	
	user.DiscordId = discordUser.ID
	err = user.Update(false)
	if err != nil {
		common.SysLog(fmt.Sprintf("Discord Bind 更新用户失败: User ID=%d, Error=%v", user.Id, err))
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "绑定失败，请重试",
		})
		return
	}

	// 添加详细日志：更新成功
	common.SysLog(fmt.Sprintf("Discord Bind: 用户 ID=%d 更新成功", user.Id))

	// 清理 OAuth state
	session.Delete("oauth_state")
	session.Delete("oauth_state_time")
	session.Save()

	// 添加详细日志：重新获取用户数据
	common.SysLog(fmt.Sprintf("Discord Bind: 重新获取用户 ID=%d 的完整数据", user.Id))
	
	// 重新获取更新后的用户数据
	err = user.FillUserById()
	if err != nil {
		common.SysLog(fmt.Sprintf("Discord Bind 获取更新后用户信息失败: User ID=%d, Error=%v", user.Id, err))
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "bind",
		})
		return
	}

	// 添加详细日志：返回数据前
	common.SysLog(fmt.Sprintf("Discord Bind: 成功完成绑定，返回用户数据 - User ID=%d, Username=%s, Discord ID=%s, GlobalName=%s", 
		user.Id, user.Username, user.DiscordId, 
		func() string {
			if discordUser.GlobalName != "" {
				return discordUser.GlobalName
			}
			return discordUser.Username
		}()))

	// 构建返回的用户信息，确保包含Discord用户名
	userData := gin.H{
		"id":          user.Id,
		"username":    user.Username,
		"discord_id":  user.DiscordId,
		"email":       user.Email,
		"role":        user.Role,
		"status":      user.Status,
		"quota":       user.Quota,
		"used_quota":  user.UsedQuota,
		"group":       user.Group,
		"display_name": user.DisplayName,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "bind",
		"data":    userData,
	})
}
