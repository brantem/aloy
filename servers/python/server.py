import os

from dotenv import load_dotenv
from flask import Flask, g
from flask_compress import Compress
from flask_cors import CORS

from db import Database
from handlers import v1

load_dotenv()

app = Flask(__name__)
app.url_map.strict_slashes = False

CORS(
    app,
    origins=os.getenv("ALLOW_ORIGINS", "*").split(","),
    allow_headers=["Content-Type", "Aloy-App-ID", "Aloy-User-ID"],
    expose_headers=["X-Total-Count"],
)
Compress(app)

db = Database(os.getenv("DB_DSN", "data.db"))


@app.before_request
def before_request():
    g.db = db


@app.get("/health")
def health():
    return "ok", 200


app.register_blueprint(v1)
