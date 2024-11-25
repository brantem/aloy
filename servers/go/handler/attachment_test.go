package handler

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"image"
	"image/png"
	"mime/multipart"
	"net/http/httptest"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/brantem/aloy/errs"
	"github.com/brantem/aloy/testutil"
	"github.com/brantem/aloy/testutil/db"
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

		something := testutil.CreateFormFile(writer, "something", "a.png", "image/png")
		png.Encode(something, img)

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

		attachment1 := testutil.CreateFormFile(writer, "attachments.1", "a.png", "image/png")
		png.Encode(attachment1, img)

		attachment2 := testutil.CreateFormFile(writer, "attachments.2", "b.png", "image/png")
		png.Encode(attachment2, img)

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

		attachment1 := testutil.CreateFormFile(writer, "attachments.1", "a.png", "image/png")
		png.Encode(attachment1, image.NewRGBA(image.Rect(0, 0, 100, 100)))

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

		attachment1 := testutil.CreateFormFile(writer, "attachments.1", "a.txt", "text/plain")
		attachment1.Write([]byte("a"))

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
				URL: fmt.Sprintf("%s/%s", h.config.assetsBaseURL, storage.UploadOpts[0].Key),
				Data: map[string]string{
					"hash": hash,
					"type": "image/png",
				}},
			}, result)
			return c.SendStatus(fiber.StatusOK)
		})

		buf := &bytes.Buffer{}
		writer := multipart.NewWriter(buf)

		attachment1 := testutil.CreateFormFile(writer, "attachments.1", "a.png", "image/png")
		png.Encode(attachment1, img)

		writer.Close()

		req := httptest.NewRequest(fiber.MethodPost, "/", buf)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		app.Test(req)
		assert.Equal(1, storage.UploadN)
		assert.Regexp(`attachments/\d+\.png`, storage.UploadOpts[0].Key)
		assert.Equal("image/png", storage.UploadOpts[0].ContentType)
	})
}

func Test_getAttachments(t *testing.T) {
	assert := assert.New(t)

	t.Run("empty", func(t *testing.T) {
		h := New(nil, nil)

		m, err := h.getAttachments(context.TODO(), []int{})
		assert.Nil(m)
		assert.Nil(err)
	})

	t.Run("success", func(t *testing.T) {
		db, mock := db.New()
		h := New(db, nil)

		mock.ExpectQuery("SELECT .+ FROM attachments").
			WithArgs(2).
			WillReturnRows(sqlmock.NewRows([]string{"id", "comment_id"}).AddRow(1, 2))

		m, err := h.getAttachments(context.TODO(), []int{2})
		assert.Equal(1, m[2][0].ID)
		assert.Nil(err)
	})
}
