package handler

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/brantem/aloy/middleware"
	"github.com/brantem/aloy/storage"
	"github.com/brantem/aloy/util"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/utils"
	"github.com/jmoiron/sqlx"
)

type config struct {
	attachmentBaseURL        string
	attachmentMaxCount       int
	attachmentMaxSize        int
	attachmentSupportedTypes []string
}

type Handler struct {
	db      *sqlx.DB
	storage storage.StorageInterface

	config config
}

func New(db *sqlx.DB, storage storage.StorageInterface) *Handler {
	attachmentMaxCount, _ := strconv.Atoi(util.Getenv("ATTACHMENT_MAX_COUNT", "3"))

	return &Handler{
		db:      db,
		storage: storage,

		config: config{
			attachmentBaseURL:        fmt.Sprintf("%s/attachments", os.Getenv("ASSETS_BASE_URL")),
			attachmentMaxCount:       attachmentMaxCount,
			attachmentMaxSize:        utils.ConvertToBytes(util.Getenv("ATTACHMENT_MAX_SIZE", "100kb")),
			attachmentSupportedTypes: strings.Split(util.Getenv("ATTACHMENT_SUPPORTED_TYPES", "image/gif,image/jpeg,image/png,image/webp"), ","),
		},
	}
}

func (h *Handler) Register(r *fiber.App, m middleware.MiddlewareInterface) {
	v1 := r.Group("/v1", m.App)

	users := v1.Group("/users")
	users.Post("/", h.createUser)

	pins := v1.Group("/pins", m.User)
	{
		pins.Get("/", h.pins)
		pins.Post("/", h.createPin)

		pinID := pins.Group("/:pinId<int>")
		pinID.Post("/complete", h.completePin)
		pinID.Delete("/", h.deletePin)

		comments := pinID.Group("/comments")
		comments.Get("/", h.pinComments)
		comments.Post("/", h.createComment)
	}

	commentID := v1.Group("/comments/:commentId<int>", m.User)
	commentID.Patch("/", h.updateComment)
	commentID.Delete("/", h.deleteComment)

}
