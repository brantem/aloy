package middleware

import (
	"github.com/brantem/aloy/constant"
	"github.com/gofiber/fiber/v2"
)

func (m *Middleware) User(c *fiber.Ctx) error {
	var result struct {
		Error any `json:"error"`
	}

	userID := c.Get("Aloy-User-ID")
	if len(userID) == 0 {
		result.Error = fiber.Map{"code": "MISSING_USER_ID"}
		return c.Status(fiber.StatusBadRequest).JSON(result)
	}
	c.Locals(constant.UserIDKey, userID)

	return c.Next()
}
