package handler

import (
	"strconv"
	"sync"

	"github.com/brantem/aloy/constant"
	"github.com/brantem/aloy/model"
	"github.com/gofiber/fiber/v2"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

func (h *Handler) pins(c *fiber.Ctx) error {
	var result struct {
		Nodes []*model.Pin `json:"nodes"`
		Error any          `json:"error"`
	}
	result.Nodes = []*model.Pin{}

	var userID string
	if c.Query("me") == "1" {
		userID = c.Locals(constant.UserIDKey).(string)
	}
	_path := c.Query("_path")

	rows, err := h.db.QueryxContext(c.UserContext(), `
		SELECT
		  p.id, p.user_id, p.path, p.w, p._x, p.x, p._y, p.y, p.completed_at,
		  (SELECT COUNT(c.id)-1 FROM comments c WHERE c.pin_id = p.id) AS total_replies
		FROM pins p
		WHERE p.app_id = ?
		  AND CASE WHEN ? != '' THEN p.user_id = ? ELSE TRUE END
		  AND CASE WHEN ? != '' THEN p._path = ? ELSE TRUE END
		ORDER BY p.id DESC
	`, c.Locals(constant.AppIDKey), userID, userID, _path, _path)
	if err != nil {
		log.Error().Err(err).Msg("pin.pins")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}
	defer rows.Close()

	var pinIds, userIds []int
	for rows.Next() {
		var node model.Pin
		if err := rows.StructScan(&node); err != nil {
			log.Error().Err(err).Msg("pin.pins")
			result.Error = constant.RespInternalServerError
			return c.Status(fiber.StatusInternalServerError).JSON(result)
		}
		pinIds = append(pinIds, node.ID)
		userIds = append(userIds, node.UserID)
		result.Nodes = append(result.Nodes, &node)
	}
	c.Set("X-Total-Count", strconv.Itoa(len(result.Nodes)))

	if len(result.Nodes) == 0 {
		return c.Status(fiber.StatusOK).JSON(result)
	}

	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()

		users, err := h.getUsers(c.Context(), userIds)
		if err != nil {
			return
		}

		for _, node := range result.Nodes {
			node.User = users[node.UserID]
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		query, args, err := sqlx.In(`
			SELECT id, pin_id, text, created_at, updated_at
			FROM comments
			WHERE pin_id IN (?)
			GROUP BY pin_id
			HAVING MIN(created_at)
		`, pinIds)
		if err != nil {
			log.Error().Err(err).Msg("pin.pins: comments")
			return
		}

		rows, err := h.db.QueryxContext(c.UserContext(), query, args...)
		if err != nil {
			log.Error().Err(err).Msg("pin.pins: comments")
			return
		}
		defer rows.Close()

		m := make(map[int]*model.Comment, len(userIds))
		for rows.Next() {
			var node struct {
				model.Comment
				PinID int `db:"pin_id"`
			}
			if err := rows.StructScan(&node); err != nil {
				log.Error().Err(err).Msg("pin.pins: comments")
				return
			}
			m[node.PinID] = &node.Comment
		}

		for _, node := range result.Nodes {
			node.Comment = m[node.ID]
		}
	}()

	wg.Wait()

	return c.Status(fiber.StatusOK).JSON(result)
}

func (h *Handler) createPin(c *fiber.Ctx) error {
	type Pin struct {
		ID int `json:"id"`
	}

	var result struct {
		Pin   *Pin `json:"pin"`
		Error any  `json:"error"`
	}

	userID := c.Locals(constant.UserIDKey)

	var body struct {
		Path  string  `json:"_path"`
		Path2 string  `json:"path"`
		W     float64 `json:"w"`
		X     float64 `json:"_x"`
		X2    float64 `json:"x"`
		Y     float64 `json:"_y"`
		Y2    float64 `json:"y"`
		Text  string  `json:"text"`
	}
	if err := c.BodyParser(&body); err != nil {
		log.Error().Err(err).Msg("pin.createPin")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	tx := h.db.MustBeginTx(c.UserContext(), nil)

	var pin Pin
	err := tx.QueryRowContext(c.UserContext(), `
		INSERT INTO pins (app_id, user_id, _path, path, w, _x, x, _y, y)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, c.Locals(constant.AppIDKey), userID, body.Path, body.Path2, body.W, body.X, body.X2, body.Y, body.Y2).Scan(&pin.ID)
	if err != nil {
		tx.Rollback()
		log.Error().Err(err).Msg("pin.createPin")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	_, err = tx.ExecContext(c.UserContext(), `
		INSERT INTO comments (pin_id, user_id, text)
		VALUES (?, ?, ?)
	`, pin.ID, userID, body.Text)
	if err != nil {
		tx.Rollback()
		log.Error().Err(err).Msg("pin.createPin")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	tx.Commit()
	result.Pin = &pin

	return c.Status(fiber.StatusOK).JSON(result)
}

func (h *Handler) completePin(c *fiber.Ctx) error {
	var result struct {
		Success bool `json:"success"`
		Error   any  `json:"error"`
	}

	if v := string(c.BodyRaw()); v == "1" {
		_, err := h.db.ExecContext(c.UserContext(), `
			UPDATE pins
			SET completed_at = CURRENT_TIMESTAMP, completed_by_id = ?
			WHERE id = ?
			  AND completed_at IS NULL
		`, c.Locals(constant.UserIDKey), c.Params("pinId"))
		if err != nil {
			log.Error().Err(err).Msg("pin.completePin")
			result.Error = constant.RespInternalServerError
			return c.Status(fiber.StatusInternalServerError).JSON(result)
		}
	} else {
		_, err := h.db.ExecContext(c.UserContext(), `
			UPDATE pins
			SET completed_at = NULL, completed_by_id = NULL
			WHERE id = ?
			  AND completed_at IS NOT NULL
		`, c.Params("pinId"))
		if err != nil {
			log.Error().Err(err).Msg("pin.completePin")
			result.Error = constant.RespInternalServerError
			return c.Status(fiber.StatusInternalServerError).JSON(result)
		}
	}

	result.Success = true
	return c.Status(fiber.StatusOK).JSON(result)
}

func (h *Handler) deletePin(c *fiber.Ctx) error {
	var result struct {
		Success bool `json:"success"`
		Error   any  `json:"error"`
	}

	_, err := h.db.ExecContext(c.UserContext(), `
		DELETE FROM pins
		WHERE id = ?
		  AND user_id = ?
	`, c.Params("pinId"), c.Locals(constant.UserIDKey))
	if err != nil {
		log.Error().Err(err).Msg("pin.deletePin")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	result.Success = true
	return c.Status(fiber.StatusOK).JSON(result)
}

func (h *Handler) pinComments(c *fiber.Ctx) error {
	var result struct {
		Nodes []*model.Comment `json:"nodes"`
		Error any              `json:"error"`
	}
	result.Nodes = []*model.Comment{}

	rows, err := h.db.QueryxContext(c.UserContext(), `
		SELECT id, user_id, text, created_at, updated_at
		FROM comments
		WHERE pin_id = ?
		ORDER BY id ASC
		LIMIT -1 OFFSET 1
	`, c.Params("pinId"))
	if err != nil {
		log.Error().Err(err).Msg("pin.pinComments")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}
	defer rows.Close()

	var userIds []int
	for rows.Next() {
		var node model.Comment
		if err := rows.StructScan(&node); err != nil {
			log.Error().Err(err).Msg("pin.pinComments")
			result.Error = constant.RespInternalServerError
			return c.Status(fiber.StatusInternalServerError).JSON(result)
		}
		userIds = append(userIds, node.UserID)
		result.Nodes = append(result.Nodes, &node)
	}
	c.Set("X-Total-Count", strconv.Itoa(len(result.Nodes)))

	if len(result.Nodes) == 0 {
		return c.Status(fiber.StatusOK).JSON(result)
	}

	users, err := h.getUsers(c.Context(), userIds)
	if err != nil {
		return c.Status(fiber.StatusOK).JSON(result)
	}

	for _, node := range result.Nodes {
		node.User = users[node.UserID]
	}

	return c.Status(fiber.StatusOK).JSON(result)
}

func (h *Handler) createComment(c *fiber.Ctx) error {
	type Comment struct {
		ID int `json:"id"`
	}

	var result struct {
		Comment *Comment `json:"comment"`
		Error   any      `json:"error"`
	}

	var body struct {
		Text string `json:"text"`
	}
	if err := c.BodyParser(&body); err != nil {
		log.Error().Err(err).Msg("pin.createComment")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	var comment Comment
	err := h.db.QueryRowContext(c.UserContext(), `
		INSERT INTO comments (pin_id, user_id, text)
		VALUES (?, ?, ?)
		RETURNING id
	`, c.Params("pinId"), c.Locals(constant.UserIDKey), body.Text).Scan(&comment.ID)
	if err != nil {
		log.Error().Err(err).Msg("pin.createComment")
		result.Error = constant.RespInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}
	result.Comment = &comment

	return c.Status(fiber.StatusOK).JSON(result)
}
