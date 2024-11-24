package body

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func TestParse(t *testing.T) {
	assert := assert.New(t)

	handler := func(c *fiber.Ctx) error {
		var data struct {
			Title *string `json:"title" validate:"trim,required"`
		}
		if err := Parse(c, &data); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(err)
		}
		return c.Status(fiber.StatusOK).JSON(data)
	}

	t.Run("json", func(t *testing.T) {
		app := fiber.New()
		app.Post("/test", handler)

		req := httptest.NewRequest(fiber.MethodPost, "/test", strings.NewReader(`{"title":" abc "}`))
		req.Header.Set("Content-Type", "application/json")

		resp, _ := app.Test(req)
		assert.Equal(fiber.StatusOK, resp.StatusCode)
		body, _ := io.ReadAll(resp.Body)
		assert.Equal(`{"title":"abc"}`, string(body))
	})

	t.Run("form", func(t *testing.T) {
		app := fiber.New()
		app.Post("/test", func(c *fiber.Ctx) error {
			var data struct {
				Title string `json:"something" form:"title" validate:"trim,required"`
			}
			if err := Parse(c, &data); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(err)
			}
			return c.Status(fiber.StatusOK).JSON(data)
		})

		body := new(bytes.Buffer)
		writer := multipart.NewWriter(body)
		writer.WriteField("title", " abc ")
		writer.Close()

		req := httptest.NewRequest(fiber.MethodPost, "/test", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		resp, _ := app.Test(req)
		assert.Equal(fiber.StatusOK, resp.StatusCode)
		b, _ := io.ReadAll(resp.Body)
		assert.Equal(`{"something":"abc"}`, string(b))
	})
}

func TestValidateStruct(t *testing.T) {
	assert := assert.New(t)

	type Data struct {
		Title *string `json:"title" validate:"trim,required"`
	}

	t.Run("invalid", func(t *testing.T) {
		data := Data{}
		json.Unmarshal([]byte(`{}`), &data)

		errs := ValidateStruct(data)
		assert.Equal(map[string]string{"title": "INVALID"}, errs)
	})

	t.Run("omit tag", func(t *testing.T) {
		var data struct {
			Title *string `json:"-" validate:"trim,required"`
		}
		json.Unmarshal([]byte(`{}`), &data)

		errs := ValidateStruct(data)
		assert.Equal(map[string]string{"Title": "INVALID"}, errs)
	})

	t.Run("success", func(t *testing.T) {
		data := Data{}
		json.Unmarshal([]byte(`{"title":" abc "}`), &data)

		errs := ValidateStruct(data)
		assert.Nil(errs)
		assert.Equal("abc", *data.Title)
	})
}

func TestValidateVar(t *testing.T) {
	assert.Equal(t, "INVALID", ValidateVar("", "trim,required"))
	assert.Empty(t, ValidateVar(" a ", "trim,required"))
}
