package handler

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/png"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"testing"

	"github.com/brantem/aloy/errs"
	"github.com/brantem/aloy/testutil/storage"
	"github.com/galdor/go-thumbhash"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func Test_uploadAttachments(t *testing.T) {
	assert := assert.New(t)

	assetsBaseURL := "https://assets.aloy.com"
	t.Setenv("ASSETS_BASE_URL", assetsBaseURL)
	t.Setenv("ATTACHMENT_MAX_COUNT", "1")
	t.Setenv("ATTACHMENT_MAX_SIZE", "100b")
	t.Setenv("ATTACHMENT_SUPPORTED_TYPES", "image/png")

	img := image.NewRGBA(image.Rect(0, 0, 1, 1))
	hash := base64.StdEncoding.EncodeToString(thumbhash.EncodeImage(img))

	createPart := func(writer *multipart.Writer, fieldname, filename string, contentType string) io.Writer {
		header := make(textproto.MIMEHeader)
		header.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, fieldname, filename))
		header.Set("Content-Type", contentType)

		part, _ := writer.CreatePart(header)
		return part
	}

	t.Run("ignore", func(t *testing.T) {
		storage := storage.New()
		h := New(nil, storage)

		app := fiber.New()
		app.Post("/", func(c *fiber.Ctx) error {
			result, err := h.uploadAttachments(c)
			assert.Nil(err)
			assert.Empty(result)
			return c.SendStatus(fiber.StatusOK)
		})

		buf := &bytes.Buffer{}
		writer := multipart.NewWriter(buf)

		part := createPart(writer, "something", "a.png", "image/png")
		png.Encode(part, img)

		writer.Close()

		req := httptest.NewRequest(fiber.MethodPost, "/", buf)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		app.Test(req)
	})

	t.Run("TOO_MANY", func(t *testing.T) {
		storage := storage.New()
		h := New(nil, storage)

		app := fiber.New()
		app.Post("/", func(c *fiber.Ctx) error {
			result, err := h.uploadAttachments(c)
			assert.Equal(errs.MapErrors{"attachments": errs.NewCodeError("TOO_MANY")}, err)
			assert.Nil(result)
			return c.JSON(err)
		})

		buf := &bytes.Buffer{}
		writer := multipart.NewWriter(buf)

		part1 := createPart(writer, "attachments.1", "a.png", "image/png")
		png.Encode(part1, img)

		part2 := createPart(writer, "attachments.2", "b.png", "image/png")
		png.Encode(part2, img)

		writer.Close()

		req := httptest.NewRequest(fiber.MethodPost, "/", buf)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		app.Test(req)
	})

	t.Run("TOO_BIG", func(t *testing.T) {
		storage := storage.New()
		h := New(nil, storage)

		app := fiber.New()
		app.Post("/", func(c *fiber.Ctx) error {
			result, err := h.uploadAttachments(c)
			assert.Equal(errs.MapErrors{"attachments.1": errs.NewCodeError("TOO_BIG")}, err)
			assert.Nil(result)
			return c.SendStatus(fiber.StatusOK)
		})

		buf := &bytes.Buffer{}
		writer := multipart.NewWriter(buf)

		part := createPart(writer, "attachments.1", "a.png", "image/png")
		png.Encode(part, image.NewRGBA(image.Rect(0, 0, 100, 100)))

		writer.Close()

		req := httptest.NewRequest(fiber.MethodPost, "/", buf)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		app.Test(req)
	})

	t.Run("UNSUPPORTED", func(t *testing.T) {
		storage := storage.New()
		h := New(nil, storage)

		app := fiber.New()
		app.Post("/", func(c *fiber.Ctx) error {
			result, err := h.uploadAttachments(c)
			assert.Equal(errs.MapErrors{"attachments.1": errs.NewCodeError("UNSUPPORTED")}, err)
			assert.Nil(result)
			return c.SendStatus(fiber.StatusOK)
		})

		buf := &bytes.Buffer{}
		writer := multipart.NewWriter(buf)

		part := createPart(writer, "attachments.1", "a.txt", "text/plain")
		part.Write([]byte("a"))

		writer.Close()

		req := httptest.NewRequest(fiber.MethodPost, "/", buf)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		app.Test(req)
	})

	t.Run("success", func(t *testing.T) {
		storage := storage.New()
		h := New(nil, storage)

		app := fiber.New()
		app.Post("/", func(c *fiber.Ctx) error {
			result, err := h.uploadAttachments(c)
			assert.Nil(err)
			assert.Equal([]*UploadAttachmentResult{{
				URL: fmt.Sprintf("%s/attachments/%s", assetsBaseURL, strings.TrimPrefix(storage.UploadOpts[0].Key, "attachments/")),
				Data: map[string]string{
					"hash": hash,
					"type": "image/png",
				}},
			}, result)
			return c.SendStatus(fiber.StatusOK)
		})

		buf := &bytes.Buffer{}
		writer := multipart.NewWriter(buf)

		part := createPart(writer, "attachments.1", "a.png", "image/png")
		png.Encode(part, img)

		writer.Close()

		req := httptest.NewRequest(fiber.MethodPost, "/", buf)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		app.Test(req)
		assert.Equal(1, storage.UploadN)
		assert.Regexp(`attachments/\d+\.png`, storage.UploadOpts[0].Key)
		assert.Equal("image/png", storage.UploadOpts[0].ContentType)
	})
}
