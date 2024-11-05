package db

import (
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

func New() (*sqlx.DB, sqlmock.Sqlmock) {
	v, mock, _ := sqlmock.New()
	return sqlx.NewDb(v, "sqlmock"), mock
}
