from flask import g, jsonify, request


def check_user_id():
    user_id = request.headers.get("Aloy-User-ID")
    if not user_id:
        return jsonify({"error": {"code": "MISSING_USER_ID"}}), 400
    g.user_id = user_id
