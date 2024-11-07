from flask import g, jsonify, request


def check_app_id():
    app_id = request.headers.get("Aloy-App-ID")
    if not app_id:
        return jsonify({"error": {"code": "MISSING_APP_ID"}}), 400
    g.app_id = app_id
