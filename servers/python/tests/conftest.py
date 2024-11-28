import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from moto import mock_aws

import db as _db
from routes.deps import get_db, get_user_id
from server import app
from storage.storage import Storage

os.environ["STORAGE_ENDPOINT"] = os.environ["MOTO_S3_CUSTOM_ENDPOINTS"] = "https://abc.r2.cloudflarestorage.com"
os.environ["STORAGE_ACCESS_KEY_ID"] = "def"
os.environ["STORAGE_ACCESS_KEY_SECRET"] = "ghi"
os.environ["STORAGE_BUCKET"] = "test"


@pytest.fixture
def db():
    conn = _db.connect(":memory:")

    migrations_dir = Path(__file__).parent.parent.parent / "migrations"
    migrations = sorted([f for f in migrations_dir.glob("*.sql") if f.is_file()])
    for migration in migrations:
        with open(migration) as f:
            conn.executescript(f.read())

    yield conn
    conn.close()


@pytest.fixture
def storage():
    with mock_aws():
        storage = Storage(region_name="us-east-1")
        storage.s3.create_bucket(Bucket=storage.bucket)
        yield storage


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    def override_get_user_id():
        return 1

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_user_id] = override_get_user_id

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
