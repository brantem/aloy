package model

type User struct {
	ID   string `json:"id" db:"_id"`
	Name string `json:"name"`
}
