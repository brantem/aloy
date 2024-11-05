package middleware

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func TestApp(t *testing.T) {
	assert := assert.New(t)

	t.Run("MISSING_APP_ID", func(t *testing.T) {
		m := Middleware{}

		app := fiber.New()
		app.Use(m.App)
		app.Get("/", func(c *fiber.Ctx) error {
			return c.SendStatus(fiber.StatusOK)
		})

		req := httptest.NewRequest("GET", "/", nil)

		resp, _ := app.Test(req, -1)
		assert.Equal(fiber.StatusBadRequest, resp.StatusCode)
		body, _ := io.ReadAll(resp.Body)
		assert.Equal(`{"error":{"code":"MISSING_APP_ID"}}`, string(body))
	})

	t.Run("success", func(t *testing.T) {
		m := Middleware{}

		app := fiber.New()
		app.Use(m.App)
		app.Get("/", func(c *fiber.Ctx) error {
			return c.SendStatus(fiber.StatusOK)
		})

		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Aloy-App-ID", "test")

		resp, _ := app.Test(req, -1)
		assert.Equal(fiber.StatusOK, resp.StatusCode)
	})
}
