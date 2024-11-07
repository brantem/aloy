from flask import Blueprint

import middlewares

from .comments import comments
from .pins import pins
from .users import users

v1 = Blueprint("v1", __name__, url_prefix="/v1")
v1.before_request(middlewares.check_app_id)

v1.register_blueprint(users, url_prefix="/users")
v1.register_blueprint(pins, url_prefix="/pins")
v1.register_blueprint(comments, url_prefix="/comments")
