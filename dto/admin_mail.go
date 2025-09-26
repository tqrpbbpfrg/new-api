package dto

// AdminMailRequest represents an admin initiated mail broadcast or targeted send
type AdminMailRequest struct {
	Subject  string `json:"subject" binding:"required,max=200"`
	Content  string `json:"content" binding:"required"` // Markdown content (server will store raw; render side should sanitize)
	Audience string `json:"audience" binding:"required,oneof=all active new custom"`
	UIDs     []int  `json:"uids"` // only for custom
}

type AdminMailResponse struct {
	TaskID       string `json:"task_id"`
	TotalTargets int    `json:"total_targets"`
	Accepted     int    `json:"accepted"`
	Skipped      int    `json:"skipped"`
	Audience     string `json:"audience"`
	MessageID    *int   `json:"message_id,omitempty"`  // for broadcast single message id
	MessageIDs   []int  `json:"message_ids,omitempty"` // for custom direct messages
}
