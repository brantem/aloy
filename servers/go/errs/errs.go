package errs

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
)

var (
	ErrInternalServerError = NewCodeError("INTERNAL_SERVER_ERROR")
	ErrNotFound            = NewCodeError("NOT_FOUND")
	ErrInvalid             = NewCodeError("INVALID")
)

type CodeError struct {
	code string
}

func NewCodeError(code string) error {
	return &CodeError{code}
}

func (e CodeError) Error() string {
	return e.code
}

func (e CodeError) MarshalJSON() ([]byte, error) {
	return json.Marshal(fiber.Map{"code": e.code})
}

type MapErrors map[string]error

func (e MapErrors) Error() string {
	return ""
}

func (e MapErrors) MarshalJSON() ([]byte, error) {
	m := make(map[string]string, len(e))
	for k, err := range e {
		m[k] = err.Error()
	}
	return json.Marshal(m)
}
