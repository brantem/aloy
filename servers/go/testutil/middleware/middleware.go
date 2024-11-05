package middleware

import (
	"github.com/brantem/aloy/constant"
	"github.com/brantem/aloy/testutil"
	"github.com/gofiber/fiber/v2"
)

type Middleware struct {
	AppIDValue  *string
	UserIDValue *string
}

func New() *Middleware {
	return &Middleware{
		AppIDValue:  testutil.Ptr("test"),
		UserIDValue: testutil.Ptr("user-1"),
	}
}

func (m *Middleware) App(c *fiber.Ctx) error {
	if m.AppIDValue != nil {
		c.Locals(constant.AppIDKey, *m.AppIDValue)
	}
	return c.Next()
}

func (m *Middleware) User(c *fiber.Ctx) error {
	if m.UserIDValue != nil {
		c.Locals(constant.UserIDKey, *m.UserIDValue)
	}
	return c.Next()
}
