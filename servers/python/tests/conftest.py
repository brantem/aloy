from pathlib import Path

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from pydantic import BaseModel, field_validator

import db as _db
from routes.deps import get_app_id, get_db, get_user_id
from server import app


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


class ValidationBody(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def strip(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("INVALID")
        return v.strip()


@pytest.fixture
def mock_client():
    @app.get("/headers", dependencies=[Depends(get_app_id), Depends(get_user_id)])
    async def headers():
        return {"success": True}

    @app.post("/validation")
    async def validation(body: ValidationBody):
        return body

    with TestClient(app) as client:
        yield client


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
