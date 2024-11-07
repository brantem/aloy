from flask import Blueprint, current_app, g, jsonify

users = Blueprint("users", __name__)


@users.get("/")
def get_users():
    try:
        with g.db.get() as conn:
            users = conn.execute("SELECT * FROM users").fetchall()
            return jsonify([dict(user) for user in users])
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"error": {"code": "INTERNAL_SERVER_ERROR"}}), 500
