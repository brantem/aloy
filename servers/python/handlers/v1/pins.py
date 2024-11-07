from flask import Blueprint, current_app, g, jsonify, request

import middlewares

pins = Blueprint("pins", __name__)
pins.before_request(middlewares.check_user_id)


def get_users(user_ids):
    try:
        with g.db.get() as conn:
            users = conn.execute(
                "SELECT _id, id, name FROM users WHERE id IN ({})".format(",".join("?" * len(user_ids))),
                user_ids,
            ).fetchall()
            return {user["id"]: {"id": user["_id"], "name": user["name"]} for user in users}
    except Exception as e:
        current_app.logger.error(e)
        return {}


def get_comments(comment_ids):
    try:
        with g.db.get() as conn:
            comments = conn.execute(
                """
                    SELECT id, pin_id, text, created_at, updated_at
			        FROM comments
			        WHERE pin_id IN ({})
			        GROUP BY pin_id
			        HAVING MIN(created_at)
                """.format(",".join("?" * len(comment_ids))),
                comment_ids,
            ).fetchall()
            return {
                comment["pin_id"]: {k: comment[k] for k in ("id", "text", "created_at", "updated_at")}
                for comment in comments
            }
    except Exception as e:
        current_app.logger.error(e)
        return {}


@pins.get("/")
def get_pins():
    user_id = None
    if request.args.get("me") == "1":
        user_id = g.user_id

    _path = request.args.get("_path")

    try:
        with g.db.get() as conn:
            pins = conn.execute(
                """
                    SELECT
                      p.id, p.user_id, p.path, p.w, p._x, p.x, p._y, p.y, p.completed_at,
                      (SELECT COUNT(c.id)-1 FROM comments c WHERE c.pin_id = p.id) AS total_replies
                    FROM pins p
                    WHERE p.app_id = ?
                      AND CASE WHEN ? IS NOT NULL THEN p.user_id = ? ELSE TRUE END
                      AND CASE WHEN ? IS NOT NULL THEN p._path = ? ELSE TRUE END
                    ORDER BY p.id DESC
                """,
                (g.app_id, user_id, user_id, _path, _path),
            ).fetchall()

            nodes = [dict(pin) for pin in pins]
            if not nodes:
                return jsonify({"nodes": [], "error": None}), {"X-Total-Count": "0"}

            # Unsure how to run these concurrently
            user_ids = [pin["user_id"] for pin in pins]
            users = get_users(user_ids)

            pin_ids = [pin["id"] for pin in pins]
            comments = get_comments(pin_ids)

            for node in nodes:
                node["user"] = users.get(node["user_id"])
                del node["user_id"]

                node["comment"] = comments.get(node["id"])

            return (jsonify({"nodes": nodes, "error": None}), {"X-Total-Count": str(len(nodes))})
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"nodes": [], "error": {"code": "INTERNAL_SERVER_ERROR"}}), 500


@pins.post("/")
def create_pin():
    body = request.get_json()

    with g.db.get() as conn:
        try:
            conn.execute("BEGIN")

            pin = conn.execute(
                """
                    INSERT INTO pins (app_id, user_id, _path, path, w, _x, x, _y, y)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    RETURNING id
                """,
                (
                    g.app_id,
                    g.user_id,
                    body.get("_path"),
                    body.get("path"),
                    body.get("w"),
                    body.get("_x"),
                    body.get("x"),
                    body.get("_y"),
                    body.get("y"),
                ),
            ).fetchone()

            conn.execute(
                "INSERT INTO comments (pin_id, user_id, text) VALUES (?, ?, ?)",
                (pin["id"], g.user_id, body.get("text")),
            )

            conn.commit()
            return jsonify({"pin": {"id": pin["id"]}, "error": None})
        except Exception as e:
            conn.rollback()
            current_app.logger.error(e)
            return jsonify({"pin": None, "error": {"code": "INTERNAL_SERVER_ERROR"}}), 500


@pins.post("/<pin_id>/complete")
def complete_pin(pin_id):
    try:
        with g.db.get() as conn:
            if request.get_data(as_text=True) == "1":
                conn.execute(
                    """
                        UPDATE pins
			            SET completed_at = CURRENT_TIMESTAMP, completed_by_id = ?
			            WHERE id = ?
			              AND completed_at IS NULL
                    """,
                    (g.user_id, pin_id),
                )
            else:
                conn.execute(
                    """
                        UPDATE pins
			            SET completed_at = NULL, completed_by_id = NULL
			            WHERE id = ?
			              AND completed_at IS NOT NULL
                    """,
                    (pin_id),
                )
            return jsonify({"success": True, "error": None})
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR"}}), 500


@pins.delete("/<pin_id>")
def delete_pin(pin_id):
    try:
        with g.db.get() as conn:
            conn.execute(
                "DELETE FROM pins WHERE id = ? AND user_id = ?",
                (pin_id, g.user_id),
            )
            return jsonify({"success": True, "error": None})
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR"}}), 500


@pins.get("/<pin_id>/comments")
def pin_comments(pin_id):
    try:
        with g.db.get() as conn:
            comments = conn.execute(
                """
                    SELECT id, user_id, text, created_at, updated_at
                    FROM comments
                    WHERE pin_id = ?
                    ORDER BY id ASC
                    LIMIT -1 OFFSET 1
                """,
                (pin_id,),
            ).fetchall()

            nodes = [dict(comment) for comment in comments]
            if not nodes:
                return jsonify({"nodes": [], "error": None}), {"X-Total-Count": "0"}

            user_ids = [comment["user_id"] for comment in nodes]
            users = get_users(user_ids)

            for node in nodes:
                node["user"] = users.get(node["user_id"])
                del node["user_id"]

            return (jsonify({"nodes": nodes, "error": None}), {"X-Total-Count": str(len(nodes))})
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"nodes": [], "error": {"code": "INTERNAL_SERVER_ERROR"}}), 500


@pins.post("/<pin_id>/comments")
def create_comment(pin_id):
    body = request.get_json()

    try:
        with g.db.get() as conn:
            comment = conn.execute(
                "INSERT INTO comments (pin_id, user_id, text) VALUES (?, ?, ?) RETURNING id",
                (pin_id, g.user_id, body.get("text")),
            ).fetchone()
            return jsonify({"comment": {"id": comment["id"]}, "error": None})
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"comment": None, "error": {"code": "INTERNAL_SERVER_ERROR"}}), 500
