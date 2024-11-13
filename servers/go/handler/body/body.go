package body

import (
	"reflect"
	"strings"
	"sync"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

var (
	validate *validator.Validate
	once     sync.Once
)

func Parse(c *fiber.Ctx, out interface{}) fiber.Map {
	once.Do(func() {
		validate = validator.New()

		validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
			tag := fld.Tag.Get("form")
			if tag == "" {
				tag = fld.Tag.Get("json")
			}

			name := strings.SplitN(tag, ",", 2)[0]
			if name == "-" {
				return ""
			}
			return name
		})

		validate.RegisterValidation("trim", func(fl validator.FieldLevel) bool {
			field := fl.Field()
			if field.Kind() == reflect.String && field.CanSet() {
				field.SetString(strings.TrimSpace(field.String()))
			}
			return true
		})
	})

	if err := c.BodyParser(out); err != nil {
		log.Error().Err(err).Msg("body.Parse")
		return nil
	}

	if err := validate.Struct(out); err != nil {
		m := fiber.Map{}
		for _, err := range err.(validator.ValidationErrors) {
			m[err.Field()] = "INVALID"
		}
		log.Error().Err(err).Msg("body.Parse")
		return m
	}

	return nil
}
