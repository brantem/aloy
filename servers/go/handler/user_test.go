package handler

import (
	"context"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/brantem/aloy/testutil/db"
	"github.com/brantem/aloy/testutil/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func Test_getUsers(t *testing.T) {
	assert := assert.New(t)

	t.Run("empty", func(t *testing.T) {
		h := New(nil)

		m, err := h.getUsers(context.TODO(), []int{})
		assert.Nil(m)
		assert.Nil(err)
	})

	t.Run("success", func(t *testing.T) {
		db, mock := db.New()
		h := New(db)

		mock.ExpectQuery("SELECT .+ FROM users").
			WithArgs(1).
			WillReturnRows(sqlmock.NewRows([]string{"id", "name"}).AddRow(1, "User 1"))

		m, err := h.getUsers(context.TODO(), []int{1})
		assert.Equal(1, m[1].ID)
		assert.Nil(err)
	})
}

func Test_createUser(t *testing.T) {
	db, mock := db.New()
	h := New(db)
	m := middleware.New()

	mock.ExpectQuery("INSERT INTO users").
		WithArgs("user-1", m.AppIDValue, "John Doe").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))

	app := fiber.New()
	h.Register(app, m)

	req := httptest.NewRequest(fiber.MethodPost, "/v1/users", strings.NewReader(`{"id":" user-1 ","name":" John Doe "}`))
	req.Header.Set("Content-Type", "application/json")

	resp, _ := app.Test(req)
	assert.Nil(t, mock.ExpectationsWereMet())
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	assert.Equal(t, `{"user":{"id":1},"error":null}`, string(body))
}
