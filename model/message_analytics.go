package model

import "time"

// MessageReadLatency 记录某条消息首次被阅读的时间（针对广播统计触达）
// 与 MessageRead 区别：MessageReadLatency 只记录第一次出现，用于计算延迟分布；不需要唯一索引 user 维度（广播统计时汇总）
// 这里按单用户粒度保留，后续可做聚合；可选地只对广播(receiver_id=0)记录
type MessageReadLatency struct {
	Id        int       `json:"id" gorm:"primaryKey"`
	MessageId int       `json:"message_id" gorm:"index;uniqueIndex:idx_msg_user_latency"`
	UserId    int       `json:"user_id" gorm:"index;uniqueIndex:idx_msg_user_latency"`
	FirstRead time.Time `json:"first_read"`
}
