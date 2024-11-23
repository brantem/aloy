package handler

import (
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
	db, mock := db.New()
	h := New(db, nil)
	m := middleware.New()

	mock.ExpectExec("DELETE FROM comments").
		WithArgs("1", m.UserIDValue).
		WillReturnResult(sqlmock.NewResult(0, 1))

	app := fiber.New()
	h.Register(app, m)

	req := httptest.NewRequest(fiber.MethodDelete, "/v1/comments/1", nil)

	resp, _ := app.Test(req)
	assert.Nil(t, mock.ExpectationsWereMet())
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	assert.Equal(t, `{"success":true,"error":null}`, string(body))
}
