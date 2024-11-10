package db

import (
	"fmt"
	"os"

	"github.com/jmoiron/sqlx"
	"github.com/mattn/go-sqlite3"
	"github.com/rs/zerolog"
	sqldblogger "github.com/simukti/sqldb-logger"
	"github.com/simukti/sqldb-logger/logadapter/zerologadapter"
)

func New() *sqlx.DB {
	logger := zerolog.New(os.Stdout)
	if os.Getenv("DEBUG") != "" {
		logger = zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout})
	}

	path := fmt.Sprintf("%s?_foreign_keys=on", os.Getenv("DB_DSN"))
	opts := []sqldblogger.Option{
		sqldblogger.WithPreparerLevel(sqldblogger.LevelDebug),
		sqldblogger.WithQueryerLevel(sqldblogger.LevelDebug),
		sqldblogger.WithExecerLevel(sqldblogger.LevelDebug),
	}
	_db := sqldblogger.OpenDriver(path, &sqlite3.SQLiteDriver{}, zerologadapter.New(logger), opts...)
	db := sqlx.NewDb(_db, "sqlite3")
	return db
}
