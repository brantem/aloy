package model

import "github.com/jmoiron/sqlx/types"

type Attachment struct {
	ID        int                `json:"id"`
	CommentID int                `json:"-" db:"comment_id"`
	URL       string             `json:"url"`
	RawData   types.NullJSONText `json:"-" db:"data"`
	Data      map[string]any     `json:"data" db:"-"`
}
