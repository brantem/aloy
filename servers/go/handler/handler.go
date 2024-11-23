package handler

import (
	"github.com/brantem/aloy/middleware"
	"github.com/brantem/aloy/storage"
	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
)

type Handler struct {
	db      *sqlx.DB
	storage storage.StorageInterface
}

func New(db *sqlx.DB, storage storage.StorageInterface) *Handler {
	return &Handler{db, storage}
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
