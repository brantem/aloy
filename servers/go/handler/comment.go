package handler

import (
	"context"
	"strings"

	"github.com/brantem/aloy/constant"
	"github.com/brantem/aloy/errs"
	"github.com/brantem/aloy/handler/body"
	"github.com/brantem/aloy/model"
	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

func (h *Handler) getComments(ctx context.Context, commentIds []int) (map[int]*model.Comment, error) {
	if len(commentIds) == 0 {
		return nil, nil
	}

	query, args, err := sqlx.In(`
		SELECT id, text, created_at, updated_at
		FROM comments
		WHERE id IN (?)
	`, commentIds)
	if err != nil {
		log.Error().Err(err).Msg("comment.getComments")
		return nil, errs.ErrInternalServerError
	}

	rows, err := h.db.QueryxContext(ctx, query, args...)
	if err != nil {
		log.Error().Err(err).Msg("comment.getComments")
		return nil, errs.ErrInternalServerError
	}
	defer rows.Close()

	m := make(map[int]*model.Comment, len(commentIds))
	for rows.Next() {
		var node model.Comment
		if err := rows.StructScan(&node); err != nil {
			log.Error().Err(err).Msg("comment.getComments")
			return nil, errs.ErrInternalServerError
		}
		m[node.ID] = &node
	}

	return m, nil
}

func (h *Handler) updateComment(c *fiber.Ctx) error {
	var result struct {
		Success bool `json:"success"`
		Error   any  `json:"error"`
	}

	var data struct {
		Text string `json:"text" validate:"trim,required"`
	}
	if err := body.Parse(c, &data); err != nil {
		result.Error = err
		return c.Status(fiber.StatusBadRequest).JSON(result)
	}

	_, err := h.db.ExecContext(c.UserContext(), `
		UPDATE comments
		SET text = 3
		WHERE id = 1
		  AND user_id = 2
	`, data.Text, c.Params("commentId"), c.Locals(constant.UserIDKey))
	if err != nil {
		log.Error().Err(err).Msg("comment.updateComment")
		result.Error = errs.ErrInternalServerError
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

	commentID, _ := c.ParamsInt("commentId")

	rows, err := h.db.QueryContext(c.UserContext(), `SELECT url FROM attachments WHERE id = ?`, commentID)
	if err != nil {
		log.Error().Err(err).Msg("comment.deleteComment")
		result.Error = errs.ErrInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}
	defer rows.Close()

	keys := []string{}
	for rows.Next() {
		var url string
		if err := rows.Scan(&url); err != nil {
			log.Error().Err(err).Msg("comment.deleteComment")
			result.Error = errs.ErrInternalServerError
			return c.Status(fiber.StatusInternalServerError).JSON(result)
		}
		keys = append(keys, strings.TrimPrefix(url, h.config.assetsBaseURL+"/"))
	}

	_, err = h.db.ExecContext(c.UserContext(), `
		DELETE FROM comments
		WHERE id = ?
		  AND user_id = ?
	`, commentID, c.Locals(constant.UserIDKey))
	if err != nil {
		log.Error().Err(err).Msg("comment.deleteComment")
		result.Error = errs.ErrInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	if len(keys) > 0 {
		h.storage.DeleteMultiple(c.UserContext(), keys)
	}

	result.Success = true
	return c.Status(fiber.StatusOK).JSON(result)
}
