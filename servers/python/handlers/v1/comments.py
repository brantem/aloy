from flask import Blueprint, current_app, g, jsonify, request

import middlewares

comments = Blueprint("comments", __name__)
comments.before_request(middlewares.check_user_id)


@comments.patch("/<comment_id>")
def update_comment(comment_id):
    body = request.get_json()

    try:
        with g.db.get() as conn:
            conn.execute(
                "UPDATE comments SET text = ? WHERE id = ? AND user_id = ?",
                (comment_id, g.user_id, body.get("text")),
            )
            return jsonify({"success": True, "error": None})
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR"}}), 500


@comments.delete("/<comment_id>")
def delete_comment(comment_id):
    try:
        with g.db.get() as conn:
            conn.execute(
                "DELETE FROM comments WHERE id = ? AND user_id = ?",
                (comment_id, g.user_id),
            )
            return jsonify({"success": True, "error": None})
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"success": False, "error": {"code": "INTERNAL_SERVER_ERROR"}}), 500
