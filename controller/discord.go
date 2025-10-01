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

func getDiscordUserInfoByCode(code string) (*DiscordUserResponse, *[]DiscordGuildMember, error) {
	if code == "" {
		return nil, nil, errors.New("无效的参数")
	}

	// 交换授权码获取访问令牌
	values := url.Values{}
	values.Set("client_id", common.DiscordClientId)
	values.Set("client_secret", common.DiscordClientSecret)
	values.Set("code", code)
	values.Set("grant_type", "authorization_code")
	values.Set("redirect_uri", fmt.Sprintf("%s/oauth/discord", common.ServerAddress))
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
		return nil, nil, errors.New("Discord 授权失败，请检查配置")
	}

	var tokenResponse DiscordTokenResponse
	err = json.NewDecoder(res.Body).Decode(&tokenResponse)
	if err != nil {
		return nil, nil, err
	}

	if tokenResponse.AccessToken == "" {
		common.SysLog("Discord 获取 Token 失败，请检查设置！")
		return nil, nil, errors.New("Discord 获取 Token 失败，请检查设置！")
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
		return nil, nil, errors.New("Discord 获取用户信息失败")
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
	if state == "" || session.Get("oauth_state") == nil || state != session.Get("oauth_state").(string) {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "state is empty or not same",
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
	discordUser, _, err := getDiscordUserInfoByCode(code)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	user := model.User{
		DiscordId: discordUser.ID,
	}
	if model.IsDiscordIdAlreadyTaken(user.DiscordId) {
		err := user.FillUserByDiscordId()
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": err.Error(),
			})
			return
		}
	} else {
		if common.RegisterEnabled {
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
			
			err := user.Insert(0)
			if err != nil {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"message": err.Error(),
				})
				return
			}
		} else {
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": "管理员关闭了新用户注册",
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
	discordUser, _, err := getDiscordUserInfoByCode(code)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	user := model.User{
		DiscordId: discordUser.ID,
	}
	if model.IsDiscordIdAlreadyTaken(user.DiscordId) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "该 Discord 账户已被绑定",
		})
		return
	}
	session := sessions.Default(c)
	id := session.Get("id")
	user.Id = id.(int)
	err = user.FillUserById()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	user.DiscordId = discordUser.ID
	err = user.Update(false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "bind",
	})
	return
}
