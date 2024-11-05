package model

type Comment struct {
	ID        int    `json:"id"`
	UserID    int    `json:"-" db:"user_id"`
	User      *User  `json:"user,omitempty"`
	Text      string `json:"text"`
	CreatedAt Time   `json:"created_at" db:"created_at"`
	UpdatedAt Time   `json:"updated_at" db:"updated_at"`
}
