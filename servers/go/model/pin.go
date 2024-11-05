package model

type Pin struct {
	ID           int      `json:"id"`
	UserID       int      `json:"-" db:"user_id"`
	User         *User    `json:"user"`
	CommentID    int      `json:"-" db:"comment_id"`
	Comment      *Comment `json:"comment" `
	Path         string   `json:"path"`
	W            float64  `json:"w"`
	X            float64  `json:"_x" db:"_x"`
	X2           float64  `json:"x" db:"x"`
	Y            float64  `json:"_y" db:"_y"`
	Y2           float64  `json:"y" db:"y"`
	CompletedAt  *Time    `json:"completed_at" db:"completed_at"`
	TotalReplies int      `json:"total_replies" db:"total_replies"`
}
