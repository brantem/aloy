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

func Test_pins(t *testing.T) {
	assert := assert.New(t)

	t.Run("empty", func(t *testing.T) {
		db, mock := db.New()
		h := New(db, nil)
		m := middleware.New()

		mock.ExpectQuery("SELECT .+ FROM pins").
			WithArgs(m.AppIDValue, "", "", "", "").
			WillReturnRows(&sqlmock.Rows{})

		app := fiber.New()
		h.Register(app, m)

		req := httptest.NewRequest(fiber.MethodGet, "/v1/pins", nil)

		resp, _ := app.Test(req)
		assert.Nil(mock.ExpectationsWereMet())
		assert.Equal(fiber.StatusOK, resp.StatusCode)
		assert.Equal("0", resp.Header.Get("X-Total-Count"))
		body, _ := io.ReadAll(resp.Body)
		assert.Equal(`{"nodes":[],"error":null}`, string(body))
	})

	t.Run("success", func(t *testing.T) {
		db, mock := db.New()
		h := New(db, nil)
		m := middleware.New()

		mock.MatchExpectationsInOrder(false)

		mock.ExpectQuery("SELECT .+ FROM pins").
			WithArgs(m.AppIDValue, m.UserIDValue, m.UserIDValue, "/abc", "/abc").
			WillReturnRows(
				sqlmock.NewRows([]string{"id", "user_id", "path", "w", "_x", "x", "_y", "y", "completed_at", "total_replies"}).
					AddRow(1, 1, "body", 1080, 100, 100, 100, 100, nil, 0),
			)

		mock.ExpectQuery("SELECT .+ FROM users").
			WithArgs(1).
			WillReturnRows(sqlmock.NewRows([]string{"id", "name"}).AddRow(1, "User 1"))

		mock.ExpectQuery("SELECT .+ FROM comments").
			WithArgs(1).
			WillReturnRows(sqlmock.NewRows([]string{"id", "pin_id", "text", "created_at", "updated_at"}).AddRow(1, 1, "Test", "2024-01-01 00:00:00", "2024-01-01 00:00:00"))

		app := fiber.New()
		h.Register(app, m)

		req := httptest.NewRequest(fiber.MethodGet, "/v1/pins?me=1&_path=/abc", nil)

		resp, _ := app.Test(req)
		assert.Nil(mock.ExpectationsWereMet())
		assert.Equal(fiber.StatusOK, resp.StatusCode)
		assert.Equal("1", resp.Header.Get("X-Total-Count"))
		body, _ := io.ReadAll(resp.Body)
		assert.Equal(`{"nodes":[{"id":1,"user":{"id":1,"name":"User 1"},"comment":{"id":1,"text":"Test","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-01T00:00:00Z"},"path":"body","w":1080,"_x":100,"x":100,"_y":100,"y":100,"completed_at":null,"total_replies":0}],"error":null}`, string(body))
	})
}

func Test_createPin(t *testing.T) {
	db, mock := db.New()
	h := New(db, nil)
	m := middleware.New()

	mock.ExpectBegin()

	pinID := 1
	mock.ExpectQuery("INSERT INTO pins").
		WithArgs(m.AppIDValue, m.UserIDValue, "/", "body", float64(1080), float64(100), float64(100), float64(100), float64(100)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(pinID))

	mock.ExpectExec("INSERT INTO comments").
		WithArgs(pinID, m.UserIDValue, "Test").
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectCommit()

	app := fiber.New()
	h.Register(app, m)

	req := httptest.NewRequest(fiber.MethodPost, "/v1/pins", strings.NewReader(`{"_path":" / ","path":" body ","w":1080,"_x":100,"x":100,"_y":100,"y":100,"text":" Test "}`))
	req.Header.Set("Content-Type", "application/json")

	resp, _ := app.Test(req)
	assert.Nil(t, mock.ExpectationsWereMet())
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	assert.Equal(t, `{"pin":{"id":1},"error":null}`, string(body))
}

func Test_completePin(t *testing.T) {
	assert := assert.New(t)

	t.Run("body == 1", func(t *testing.T) {
		db, mock := db.New()
		h := New(db, nil)
		m := middleware.New()

		mock.ExpectExec("UPDATE pins SET completed_at = CURRENT_TIMESTAMP").
			WithArgs(m.UserIDValue, "1").
			WillReturnResult(sqlmock.NewResult(0, 1))

		app := fiber.New()
		h.Register(app, m)

		req := httptest.NewRequest(fiber.MethodPost, "/v1/pins/1/complete", strings.NewReader(" 1 "))

		resp, _ := app.Test(req)
		assert.Nil(mock.ExpectationsWereMet())
		assert.Equal(fiber.StatusOK, resp.StatusCode)
		body, _ := io.ReadAll(resp.Body)
		assert.Equal(`{"success":true,"error":null}`, string(body))
	})

	t.Run("body != 1", func(t *testing.T) {
		db, mock := db.New()
		h := New(db, nil)
		m := middleware.New()

		mock.ExpectExec("UPDATE pins SET completed_at = NULL").
			WithArgs("1").
			WillReturnResult(sqlmock.NewResult(0, 1))

		app := fiber.New()
		h.Register(app, m)

		req := httptest.NewRequest(fiber.MethodPost, "/v1/pins/1/complete", strings.NewReader(" a "))

		resp, _ := app.Test(req)
		assert.Nil(mock.ExpectationsWereMet())
		assert.Equal(fiber.StatusOK, resp.StatusCode)
		body, _ := io.ReadAll(resp.Body)
		assert.Equal(`{"success":true,"error":null}`, string(body))
	})
}

func Test_deletePin(t *testing.T) {
	db, mock := db.New()
	h := New(db, nil)
	m := middleware.New()

	mock.ExpectExec("DELETE FROM pins").
		WithArgs("1", m.UserIDValue).
		WillReturnResult(sqlmock.NewResult(0, 1))

	app := fiber.New()
	h.Register(app, m)

	req := httptest.NewRequest(fiber.MethodDelete, "/v1/pins/1", nil)

	resp, _ := app.Test(req)
	assert.Nil(t, mock.ExpectationsWereMet())
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	assert.Equal(t, `{"success":true,"error":null}`, string(body))
}

func Test_pinComments(t *testing.T) {
	assert := assert.New(t)

	t.Run("empty", func(t *testing.T) {
		db, mock := db.New()
		h := New(db, nil)
		m := middleware.New()

		mock.ExpectQuery("SELECT .+ FROM comments").
			WithArgs("1").
			WillReturnRows(&sqlmock.Rows{})

		app := fiber.New()
		h.Register(app, m)

		req := httptest.NewRequest(fiber.MethodGet, "/v1/pins/1/comments", nil)

		resp, _ := app.Test(req)
		assert.Nil(mock.ExpectationsWereMet())
		assert.Equal(fiber.StatusOK, resp.StatusCode)
		assert.Equal("0", resp.Header.Get("X-Total-Count"))
		body, _ := io.ReadAll(resp.Body)
		assert.Equal(`{"nodes":[],"error":null}`, string(body))
	})

	t.Run("success", func(t *testing.T) {
		db, mock := db.New()
		h := New(db, nil)
		m := middleware.New()

		mock.MatchExpectationsInOrder(false)

		mock.ExpectQuery("SELECT .+ FROM comments").
			WithArgs("1").
			WillReturnRows(
				sqlmock.NewRows([]string{"id", "user_id", "text", "created_at", "updated_at"}).
					AddRow(1, 1, "Test", "2024-01-01 00:00:00", "2024-01-01 00:00:00"),
			)

		mock.ExpectQuery("SELECT .+ FROM users").
			WithArgs(1).
			WillReturnRows(sqlmock.NewRows([]string{"id", "name"}).AddRow(1, "User 1"))

		app := fiber.New()
		h.Register(app, m)

		req := httptest.NewRequest(fiber.MethodGet, "/v1/pins/1/comments", nil)

		resp, _ := app.Test(req)
		assert.Nil(mock.ExpectationsWereMet())
		assert.Equal(fiber.StatusOK, resp.StatusCode)
		assert.Equal("1", resp.Header.Get("X-Total-Count"))
		body, _ := io.ReadAll(resp.Body)
		assert.Equal(`{"nodes":[{"id":1,"user":{"id":1,"name":"User 1"},"text":"Test","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-01T00:00:00Z"}],"error":null}`, string(body))
	})
}

func Test_createComment(t *testing.T) {
	db, mock := db.New()
	h := New(db, nil)
	m := middleware.New()

	mock.ExpectQuery("INSERT INTO comments").
		WithArgs("1", m.UserIDValue, "Test").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))

	app := fiber.New()
	h.Register(app, m)

	req := httptest.NewRequest(fiber.MethodPost, "/v1/pins/1/comments", strings.NewReader(`{"text":" Test "}`))
	req.Header.Set("Content-Type", "application/json")

	resp, _ := app.Test(req)
	assert.Nil(t, mock.ExpectationsWereMet())
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	body, _ := io.ReadAll(resp.Body)
	assert.Equal(t, `{"comment":{"id":1},"error":null}`, string(body))
}
