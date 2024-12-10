package body

import (
	"reflect"
	"strings"
	"sync"

	"github.com/brantem/aloy/errs"
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

var (
	validate *validator.Validate
	once     sync.Once
)

func initValidate() {
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
}

func Parse(c *fiber.Ctx, out any) error {
	if err := c.BodyParser(out); err != nil {
		log.Error().Err(err).Msg("body.Parse")
		return errs.ErrInternalServerError
	}

	return ValidateStruct(out)
}

func ValidateStruct(s any) error {
	once.Do(initValidate)

	if err := validate.Struct(s); err != nil {
		m := make(errs.MapErrors)
		for _, err := range err.(validator.ValidationErrors) {
			m[err.Field()] = errs.ErrInvalid
		}
		log.Error().Err(err).Msg("body.ValidateStruct")
		return m
	}

	return nil
}

func ValidateVar(field any, tag string) error {
	once.Do(initValidate)

	if err := validate.Var(field, tag); err != nil {
		log.Error().Err(err).Msg("body.ValidateVar")
		return errs.ErrInvalid
	}

	return nil
}
