from flask import Blueprint, current_app, g, jsonify, request

users = Blueprint("users", __name__)


@users.post("/")
def create_user():
    body = request.get_json()

    try:
        with g.db.get() as conn:
            user = conn.execute(
                """
                    INSERT INTO users (_id, app_id, name)
		            VALUES (?, ?, ?)
		            ON CONFLICT (_id, app_id) DO UPDATE SET name = EXCLUDED.name
		            RETURNING id
                """,
                (body.get("id"), g.app_id, body.get("name")),
            ).fetchone()
            return jsonify({"user": {"id": user["id"]}, "error": None})
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"error": {"code": "INTERNAL_SERVER_ERROR"}}), 500
