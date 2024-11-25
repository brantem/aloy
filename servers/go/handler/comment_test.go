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
	"github.com/brantem/aloy/testutil/storage"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func Test_getComments(t *testing.T) {
	assert := assert.New(t)

	t.Run("empty", func(t *testing.T) {
		h := New(nil, nil)

		m, err := h.getComments(context.TODO(), []int{})
		assert.Nil(m)
		assert.Nil(err)
	})

	t.Run("success", func(t *testing.T) {
		db, mock := db.New()
		h := New(db, nil)

		mock.ExpectQuery("SELECT .+ FROM comments").
			WithArgs(1).
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))

		m, err := h.getComments(context.TODO(), []int{1})
		assert.Equal(1, m[1].ID)
		assert.Nil(err)
	})
}

func Test_updateComment(t *testing.T) {
	db, mock := db.New()
	h := New(db, nil)
	m := middleware.New()

	mock.ExpectExec("UPDATE comments").
		WithArgs("abc", "1", m.UserIDValue).
		WillReturnResult(sqlmock.NewResult(0, 1))

	app := fiber.New()
	h.Register(app, m)

	req := httptest.NewRequest(fiber.MethodPatch, "/v1/comments/1", strings.NewReader(`{"text":" abc "}`))
	req.Header.Set("Content-Type", "application/json")

	resp, _ := app.Test(req)
	assert.Nil(t, mock.ExpectationsWereMet())
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	assert.Equal(t, `{"success":true,"error":null}`, string(body))
}

func Test_deleteComment(t *testing.T) {
	t.Setenv("ASSETS_BASE_URL", "https://assets.aloy.com")

	db, mock := db.New()
	storage := storage.New()
	h := New(db, storage)
	m := middleware.New()

	mock.ExpectQuery("SELECT url FROM attachments").
		WithArgs(1).
		WillReturnRows(sqlmock.NewRows([]string{"url"}).AddRow("https://assets.aloy.com/attachments/a.png"))

	mock.ExpectExec("DELETE FROM comments").
		WithArgs(1, m.UserIDValue).
		WillReturnResult(sqlmock.NewResult(0, 1))

	app := fiber.New()
	h.Register(app, m)

	req := httptest.NewRequest(fiber.MethodDelete, "/v1/comments/1", nil)

	resp, _ := app.Test(req)
	assert.Nil(t, mock.ExpectationsWereMet())
	assert.Equal(t, [][]string{{"attachments/a.png"}}, storage.DeleteMultipleKeys)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	assert.Equal(t, `{"success":true,"error":null}`, string(body))
}
