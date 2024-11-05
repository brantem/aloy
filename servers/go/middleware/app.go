package middleware

import (
	"github.com/brantem/aloy/constant"
	"github.com/gofiber/fiber/v2"
)

func (m *Middleware) App(c *fiber.Ctx) error {
	var result struct {
		Error any `json:"error"`
	}

	appID := c.Get("Aloy-App-ID")
	if len(appID) == 0 {
		result.Error = fiber.Map{"code": "MISSING_APP_ID"}
		return c.Status(fiber.StatusBadRequest).JSON(result)
	}
	c.Locals(constant.AppIDKey, appID)

	return c.Next()
}
