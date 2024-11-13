package handler

import (
	"context"

	"github.com/brantem/aloy/constant"
	"github.com/brantem/aloy/handler/body"
	"github.com/brantem/aloy/model"
	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

func (h *Handler) getUsers(ctx context.Context, userIds []int) (map[int]*model.User, error) {
	if len(userIds) == 0 {
		return nil, nil
	}

	query, args, err := sqlx.In(`SELECT id, name FROM users WHERE id IN (?)`, userIds)
	if err != nil {
		log.Error().Err(err).Msg("user.getUsers")
		return nil, constant.ErrInternalServerError
	}

	rows, err := h.db.QueryxContext(ctx, query, args...)
	if err != nil {
		log.Error().Err(err).Msg("user.getUsers")
		return nil, constant.ErrInternalServerError
	}
	defer rows.Close()

	m := make(map[int]*model.User, len(userIds))
	for rows.Next() {
		var node model.User
		if err := rows.StructScan(&node); err != nil {
			log.Error().Err(err).Msg("user.getUsers")
			return nil, constant.ErrInternalServerError
		}
		m[node.ID] = &node
	}

	return m, nil
}

func (h *Handler) createUser(c *fiber.Ctx) error {
	type User struct {
		ID int `json:"id"`
	}

	var result struct {
		User  *User `json:"user"`
		Error any   `json:"error"`
	}

	var data struct {
		ID   string `json:"id" validate:"trim,required"`
		Name string `json:"name" validate:"trim,required"`
	}
	if err := body.Parse(c, &data); err != nil {
		result.Error = err
		return c.Status(fiber.StatusBadRequest).JSON(result)
	}

	var user User
	err := h.db.QueryRowContext(c.UserContext(), `
		INSERT INTO users (_id, app_id, name)
		VALUES (?, ?, ?)
		ON CONFLICT (_id, app_id) DO UPDATE SET name = EXCLUDED.name
		RETURNING id
	`, data.ID, c.Locals(constant.AppIDKey), data.Name).Scan(&user.ID)
	if err != nil {
		log.Error().Err(err).Msg("user.createUser")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}
	result.User = &user

	return c.Status(fiber.StatusOK).JSON(result)
}
