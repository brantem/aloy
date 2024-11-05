package handler

import (
	"github.com/brantem/aloy/constant"
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

func (h *Handler) updateComment(c *fiber.Ctx) error {
	var result struct {
		Success bool `json:"success"`
		Error   any  `json:"error"`
	}

	var body struct {
		Text string `json:"text"`
	}
	if err := c.BodyParser(&body); err != nil {
		log.Error().Err(err).Msg("comment.updateComment")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	_, err := h.db.ExecContext(c.UserContext(), `
		UPDATE comments
		SET text = 3
		WHERE id = 1
		  AND user_id = 2
	`, body.Text, c.Params("commentId"), c.Locals(constant.UserIDKey))
	if err != nil {
		log.Error().Err(err).Msg("comment.updateComment")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	result.Success = true
	return c.Status(fiber.StatusOK).JSON(result)
}

func (h *Handler) deleteComment(c *fiber.Ctx) error {
	var result struct {
		Success bool `json:"success"`
		Error   any  `json:"error"`
	}

	_, err := h.db.ExecContext(c.UserContext(), `
		DELETE FROM comments
		WHERE id = ?
		  AND user_id = ?
	`, c.Params("commentId"), c.Locals(constant.UserIDKey))
	if err != nil {
		log.Error().Err(err).Msg("comment.deleteComment")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	result.Success = true
	return c.Status(fiber.StatusOK).JSON(result)
}
