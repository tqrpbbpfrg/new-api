package controller

import (
	"net/http"
	"one-api/model"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// SearchSimpleUsers admin-only lightweight user autocomplete
func SearchSimpleUsers(c *gin.Context) {
	kw := strings.TrimSpace(c.Query("q"))
	limitStr := c.Query("limit")
	limit := 20
	if v, err := strconv.Atoi(limitStr); err == nil && v > 0 && v < 101 {
		limit = v
	}
	q := model.DB.Model(&model.User{}).Select("id, username, display_name")
	if kw != "" {
		if id, err := strconv.Atoi(kw); err == nil { // numeric direct id
			q = q.Where("id = ?", id)
		} else {
			like := "%" + kw + "%"
			q = q.Where("username LIKE ? OR display_name LIKE ?", like, like)
		}
	}
	var rows []struct {
		Id                    int
		Username, DisplayName string
	}
	if err := q.Limit(limit).Find(&rows).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	arr := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		label := r.DisplayName
		if label == "" {
			label = r.Username
		}
		arr = append(arr, map[string]any{"id": r.Id, "username": r.Username, "display_name": r.DisplayName, "label": label})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": map[string]any{"items": arr}})
}
