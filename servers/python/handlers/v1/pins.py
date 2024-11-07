from flask import Blueprint, current_app, g, jsonify

import middlewares

pins = Blueprint("pins", __name__)
pins.before_request(middlewares.check_user_id)


@pins.get("/")
def get_pins():
    try:
        with g.db.get() as conn:
            pins = conn.execute("SELECT * FROM pins").fetchall()
            return jsonify([dict(pin) for pin in pins])
    except Exception as e:
        current_app.logger.error(e)
        return jsonify({"error": {"code": "INTERNAL_SERVER_ERROR"}}), 500
