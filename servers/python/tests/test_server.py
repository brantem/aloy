import pytest
from fastapi import Depends, status
from fastapi.testclient import TestClient
from pydantic import BaseModel, field_validator

from routes.deps import get_app_id, get_user_id
from server import app


class ValidationBody(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def strip(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("INVALID")
        return v.strip()


@pytest.fixture(scope="module")
def client():
    @app.get("/headers", dependencies=[Depends(get_app_id), Depends(get_user_id)])
    async def headers():
        return {"success": True}

    @app.post("/validation")
    async def validation(body: ValidationBody):
        return body

    with TestClient(app) as client:
        yield client


def test_missing_headers(client):
    # MISSING_APP_ID should be first
    response = client.get("/headers")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": {"code": "MISSING_APP_ID"}}

    # MISSING_USER_ID
    response = client.get("/headers", headers={"Aloy-App-ID": "test"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": {"code": "MISSING_USER_ID"}}

    # MISSING_APP_ID
    response = client.get("/headers", headers={"Aloy-User-ID": "1"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": {"code": "MISSING_APP_ID"}}

    # ok
    response = client.get("/headers", headers={"Aloy-App-ID": "test", "Aloy-User-ID": "1"})
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"success": True}


def test_validation(client):
    # REQUIRED
    response = client.post("/validation", json={})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": {"text": "REQUIRED"}}

    # INVALID
    response = client.post("/validation", json={"text": " "})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": {"text": "INVALID"}}

    # ok
    response = client.post("/validation", json={"text": " a "})
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"text": "a"}
