package model

import "time"

// Message 站内消息/广播/私信
// receiver_id = 0 代表广播(所有用户可见)
// reply_to 指向父消息ID，用于线程/会话
type Message struct {
	Id         int `json:"id" gorm:"primaryKey"`
	SenderId   int `json:"sender_id" gorm:"index;default:0"`
	ReceiverId int `json:"receiver_id" gorm:"index;default:0;index:idx_receiver_id_id,priority:1"`
	// Id already primary; add to composite for pagination by id + receiver
	// GORM can't reuse primary in composite automatically, so we add another index line via tag on CreatedAt or an invisible struct tag if needed.
	Subject      string    `json:"subject" gorm:"type:varchar(200)"`
	Content      string    `json:"content" gorm:"type:text"`
	ReplyTo      *int      `json:"reply_to" gorm:"index"`
	CreatedAt    time.Time `json:"created_at"`
	Audience     string    `json:"audience" gorm:"type:varchar(32);default:'direct'"` // all/new/active/direct
	TotalTargets int       `json:"total_targets" gorm:"default:0"`                    // 统计目标用户数（direct=1, broadcast=匹配用户数）
}

// MessageRead 单用户已读记录（广播消息需要单独记录已读状态）
type MessageRead struct {
	Id        int       `json:"id" gorm:"primaryKey"`
	MessageId int       `json:"message_id" gorm:"index;uniqueIndex:idx_message_read_user"`
	UserId    int       `json:"user_id" gorm:"index;uniqueIndex:idx_message_read_user"`
	ReadAt    time.Time `json:"read_at"`
}
