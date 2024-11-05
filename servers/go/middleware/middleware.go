package middleware

import "github.com/gofiber/fiber/v2"

type MiddlewareInterface interface {
	App(c *fiber.Ctx) error
	User(c *fiber.Ctx) error
}

type Middleware struct {
}

func New() MiddlewareInterface {
	return &Middleware{}
}
