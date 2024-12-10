package handler

import (
	"encoding/json"
	"strconv"
	"strings"
	"sync"

	sq "github.com/Masterminds/squirrel"
	"github.com/brantem/aloy/constant"
	"github.com/brantem/aloy/errs"
	"github.com/brantem/aloy/handler/body"
	"github.com/brantem/aloy/model"
	"github.com/gofiber/fiber/v2"
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
		WITH t AS (
		  SELECT id, pin_id
		  FROM comments
		  GROUP BY pin_id
		  HAVING MIN(created_at)
		)
		SELECT
		  p.id, p.user_id, t.id AS comment_id, p.path, p.w, p._x, p.x, p._y, p.y, p.completed_at,
		  (SELECT COUNT(c.id)-1 FROM comments c WHERE c.pin_id = p.id) AS total_replies
		FROM pins p
		JOIN t ON t.pin_id = p.id
		WHERE p.app_id = ?
		  AND CASE WHEN ? != '' THEN p.user_id = ? ELSE TRUE END
		  AND CASE WHEN ? != '' THEN p._path = ? ELSE TRUE END
		ORDER BY p.id DESC
	`, c.Locals(constant.AppIDKey), userID, userID, _path, _path)
	if err != nil {
		log.Error().Err(err).Msg("pin.pins")
		result.Error = errs.ErrInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}
	defer rows.Close()

	var userIds, commentIds []int
	for rows.Next() {
		var node model.Pin
		if err := rows.StructScan(&node); err != nil {
			log.Error().Err(err).Msg("pin.pins")
			result.Error = errs.ErrInternalServerError
			return c.Status(fiber.StatusInternalServerError).JSON(result)
		}
		userIds = append(userIds, node.UserID)
		commentIds = append(commentIds, node.CommentID)
		result.Nodes = append(result.Nodes, &node)
	}
	c.Set("X-Total-Count", strconv.Itoa(len(result.Nodes)))

	if len(result.Nodes) == 0 {
		return c.Status(fiber.StatusOK).JSON(result)
	}

	comments := make(map[int]*model.Comment, len(commentIds))
	attachments := make(map[int][]*model.Attachment, len(commentIds))

	var wg sync.WaitGroup

	wg.Add(1)
	go func() {
		defer wg.Done()

		m, err := h.getUsers(c.Context(), userIds)
		if err != nil {
			return
		}

		for _, node := range result.Nodes {
			node.User = m[node.UserID]
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()

		m, _ := h.getComments(c.UserContext(), commentIds)
		if err != nil {
			return
		}
		comments = m
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()

		m, _ := h.getAttachments(c.UserContext(), commentIds)
		if err != nil {
			return
		}
		attachments = m
	}()

	wg.Wait()

	for _, node := range result.Nodes {
		node.Comment = comments[node.CommentID]
		if v, ok := attachments[node.CommentID]; ok {
			node.Comment.Attachments = v
		} else {
			node.Comment.Attachments = []*model.Attachment{}
		}
	}

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

	var data struct {
		Path  string  `form:"_path" validate:"trim,required"`
		Path2 string  `form:"path" validate:"trim,required"`
		W     float64 `form:"w" validate:"number,required"`
		X     float64 `form:"_x" validate:"number,required"`
		X2    float64 `form:"x" validate:"number,required"`
		Y     float64 `form:"_y" validate:"number,required"`
		Y2    float64 `form:"y" validate:"number,required"`
		Text  string  `form:"text" validate:"trim,required"`
	}
	if err := body.Parse(c, &data); err != nil {
		result.Error = err
		return c.Status(fiber.StatusBadRequest).JSON(result)
	}

	attachments, err := h.uploadAttachments(c)
	if err != nil {
		result.Error = err
		if err == errs.ErrInternalServerError {
			c.Status(fiber.StatusInternalServerError)
		} else {
			c.Status(fiber.StatusBadRequest)
		}
		return c.JSON(result)
	}

	tx := h.db.MustBeginTx(c.UserContext(), nil)

	var pin Pin
	err = tx.QueryRowContext(c.UserContext(), `
		INSERT INTO pins (app_id, user_id, _path, path, w, _x, x, _y, y)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		RETURNING id
	`, c.Locals(constant.AppIDKey), userID, data.Path, data.Path2, data.W, data.X, data.X2, data.Y, data.Y2).Scan(&pin.ID)
	if err != nil {
		tx.Rollback()
		log.Error().Err(err).Msg("pin.createPin")
		result.Error = errs.ErrInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	var commentID int
	err = tx.QueryRowContext(c.UserContext(), `
		INSERT INTO comments (pin_id, user_id, text)
		VALUES (?, ?, ?)
		RETURNING id
	`, pin.ID, userID, data.Text).Scan(&commentID)
	if err != nil {
		tx.Rollback()
		log.Error().Err(err).Msg("pin.createPin")
		result.Error = errs.ErrInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	if len(attachments) > 0 {
		qb := sq.Insert("attachments").Columns("comment_id", "url", "data")
		for _, attachment := range attachments {
			buf, _ := json.Marshal(attachment.Data)
			qb = qb.Values(commentID, attachment.URL, string(buf))
		}

		if _, err = qb.PlaceholderFormat(sq.Dollar).RunWith(tx).Exec(); err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("pin.createPin")
			result.Error = errs.ErrInternalServerError
			return c.Status(fiber.StatusInternalServerError).JSON(result)
		}
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

	if v := strings.TrimSpace(string(c.BodyRaw())); v == "1" {
		_, err := h.db.ExecContext(c.UserContext(), `
			UPDATE pins
			SET completed_at = CURRENT_TIMESTAMP, completed_by_id = ?
			WHERE id = ?
			  AND completed_at IS NULL
		`, c.Locals(constant.UserIDKey), c.Params("pinId"))
		if err != nil {
			log.Error().Err(err).Msg("pin.completePin")
			result.Error = errs.ErrInternalServerError
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
			result.Error = errs.ErrInternalServerError
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
		result.Error = errs.ErrInternalServerError
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
		result.Error = errs.ErrInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}
	defer rows.Close()

	var userIds, commentIds []int
	for rows.Next() {
		var node model.Comment
		if err := rows.StructScan(&node); err != nil {
			log.Error().Err(err).Msg("pin.pinComments")
			result.Error = errs.ErrInternalServerError
			return c.Status(fiber.StatusInternalServerError).JSON(result)
		}
		userIds = append(userIds, node.UserID)
		commentIds = append(commentIds, node.ID)
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

		m, err := h.getUsers(c.Context(), userIds)
		if err != nil {
			return
		}

		for _, node := range result.Nodes {
			node.User = m[node.UserID]
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()

		m, err := h.getAttachments(c.Context(), commentIds)
		if err != nil {
			return
		}

		for _, node := range result.Nodes {
			if v, ok := m[node.ID]; ok {
				node.Attachments = v
			} else {
				node.Attachments = []*model.Attachment{}
			}
		}
	}()

	wg.Wait()

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

	var data struct {
		Text string `form:"text" validate:"trim,required"`
	}
	if err := body.Parse(c, &data); err != nil {
		result.Error = err
		return c.Status(fiber.StatusBadRequest).JSON(result)
	}

	attachments, err := h.uploadAttachments(c)
	if err != nil {
		result.Error = err
		if err == errs.ErrInternalServerError {
			c.Status(fiber.StatusInternalServerError)
		} else {
			c.Status(fiber.StatusBadRequest)
		}
		return c.JSON(result)
	}

	tx := h.db.MustBeginTx(c.UserContext(), nil)

	var comment Comment
	err = tx.QueryRowContext(c.UserContext(), `
		INSERT INTO comments (pin_id, user_id, text)
		VALUES (?, ?, ?)
		RETURNING id
	`, c.Params("pinId"), c.Locals(constant.UserIDKey), data.Text).Scan(&comment.ID)
	if err != nil {
		tx.Rollback()
		log.Error().Err(err).Msg("pin.createComment")
		result.Error = errs.ErrInternalServerError
		return c.Status(fiber.StatusInternalServerError).JSON(result)
	}

	if len(attachments) > 0 {
		qb := sq.Insert("attachments").Columns("comment_id", "url", "data")
		for _, attachment := range attachments {
			buf, _ := json.Marshal(attachment.Data)
			qb = qb.Values(comment.ID, attachment.URL, string(buf))
		}

		if _, err = qb.PlaceholderFormat(sq.Dollar).RunWith(tx).Exec(); err != nil {
			tx.Rollback()
			log.Error().Err(err).Msg("pin.createComment")
			result.Error = errs.ErrInternalServerError
			return c.Status(fiber.StatusInternalServerError).JSON(result)
		}
	}

	tx.Commit()
	result.Comment = &comment

	return c.Status(fiber.StatusOK).JSON(result)
}
