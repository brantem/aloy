import logging
import sqlite3

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, field_validator

from routes.deps import get_app_id, get_db

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/users")


class CreateUserBody(BaseModel):
    id: str
    name: str

    @field_validator("id", "name")
    @classmethod
    def strip(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("INVALID")
        return v.strip()


@router.post("/")
async def get_users(
    body: CreateUserBody,
    response: Response,
    db: sqlite3.Connection = Depends(get_db),
    app_id=Depends(get_app_id),
):
    try:
        sql = """
            INSERT INTO users (_id, app_id, name)
            VALUES (?, ?, ?)
            ON CONFLICT (_id, app_id) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """
        user = db.execute(sql, (body.id, app_id, body.name)).fetchone()
        return {"user": {"id": user["id"]}, "error": None}
    except Exception as e:
        logger.error(f"users.get_users: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"user": None, "error": {"code": "INTERNAL_SERVER_ERROR"}}
