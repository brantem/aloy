from flask import Blueprint, current_app, g, jsonify

import middlewares

comments = Blueprint("comments", __name__)
comments.before_request(middlewares.check_user_id)


@comments.get("/")
def get_comments():
    try:
        with g.db.get() as conn:
            comments = conn.execute("SELECT * FROM comments").fetchall()
            return jsonify([dict(comment) for comment in comments])
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"error": {"code": "INTERNAL_SERVER_ERROR"}}), 500
