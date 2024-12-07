import logging
import sqlite3
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Path, Response, status
from pydantic import BaseModel, Field, field_validator

from routes.deps import get_app_id, get_db, get_user_id

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/pins", dependencies=[Depends(get_user_id)])


@router.get("/")
def get_pins(
    response: Response,
    db: sqlite3.Connection = Depends(get_db),
    app_id=Depends(get_app_id),
    _user_id=Depends(get_user_id),
    me: int | None = None,
    _path: str | None = None,
):
    user_id = None
    if me == 1:
        user_id = _user_id

    try:
        sql = """
            SELECT
                p.id, p.user_id, p.path, p.w, p._x, p.x, p._y, p.y, p.completed_at,
                (SELECT COUNT(c.id)-1 FROM comments c WHERE c.pin_id = p.id) AS total_replies
            FROM pins p
            WHERE p.app_id = ?
                AND CASE WHEN ? IS NOT NULL THEN p.user_id = ? ELSE TRUE END
                AND CASE WHEN ? IS NOT NULL THEN p._path = ? ELSE TRUE END
            ORDER BY p.id DESC
        """
        pins = db.execute(sql, (app_id, user_id, user_id, _path, _path)).fetchall()

        nodes = [dict(pin) for pin in pins]
        if not nodes:
            response.headers["X-Total-Count"] = "0"
            return {"nodes": [], "error": None}

        # Unsure how to run these concurrently
        user_ids = [pin["user_id"] for pin in pins]
        users = get_users(db, user_ids)

        pin_ids = [pin["id"] for pin in pins]
        comments = get_comments(db, pin_ids)

        for node in nodes:
            node["user"] = users.get(node["user_id"])
            del node["user_id"]

            node["comment"] = comments.get(node["id"])

        response.headers["X-Total-Count"] = str(len(nodes))
        return {"nodes": nodes, "error": None}
    except Exception as e:
        logger.error(f"pins.get_pins: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"nodes": [], "error": {"code": "INTERNAL_SERVER_ERROR"}}


class CreatePinBody(BaseModel):
    underscore_path: str = Field(alias="_path")
    path: str
    w: float
    underscore_x: float = Field(alias="_x")
    x: float
    underscore_y: float = Field(alias="_y")
    y: float
    text: str

    @field_validator("underscore_path", "path", "text")
    @classmethod
    def strip(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("INVALID")
        return v.strip()


@router.post("/")
async def create_pin(
    body: CreatePinBody,
    response: Response,
    db: sqlite3.Connection = Depends(get_db),
    app_id=Depends(get_app_id),
    user_id=Depends(get_user_id),
):
    try:
        sql = """
            INSERT INTO pins (app_id, user_id, _path, path, w, _x, x, _y, y)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        """
        params = (
            app_id,
            user_id,
            body.underscore_path,
            body.path,
            body.w,
            body.underscore_x,
            body.x,
            body.underscore_y,
            body.y,
        )
        pin = db.execute(sql, params).fetchone()

        sql = "INSERT INTO comments (pin_id, user_id, text) VALUES (?, ?, ?)"
        db.execute(sql, (pin["id"], user_id, body.text))

        db.commit()
        return {"pin": {"id": pin["id"]}, "error": None}
    except Exception as e:
        logger.error(f"pins.create_pin: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"pin": None, "error": {"code": "INTERNAL_SERVER_ERROR"}}


@router.post("/{pin_id}/complete")
def complete_pin(
    pin_id: Annotated[int, Path()],
    response: Response,
    body: str = Body(default=""),
    db: sqlite3.Connection = Depends(get_db),
    user_id=Depends(get_user_id),
):
    try:
        if body.strip() == "1":
            db.execute(
                """
                    UPDATE pins
                    SET completed_at = CURRENT_TIMESTAMP, completed_by_id = ?
                    WHERE id = ?
                        AND completed_at IS NULL
                """,
                (user_id, pin_id),
            )
        else:
            db.execute(
                """
                    UPDATE pins
                    SET completed_at = NULL, completed_by_id = NULL
                    WHERE id = ?
                        AND completed_at IS NOT NULL
                """,
                (pin_id,),
            )
        return {"success": True, "error": None}
    except Exception as e:
        logger.error(f"pins.complete_pin: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": {"code": "INTERNAL_SERVER_ERROR"}}


@router.delete("/{pin_id}")
def delete_pin(
    pin_id: Annotated[int, Path()],
    response: Response,
    db: sqlite3.Connection = Depends(get_db),
    user_id=Depends(get_user_id),
):
    try:
        db.execute("DELETE FROM pins WHERE id = ? AND user_id = ?", (pin_id, user_id))
        return {"success": True, "error": None}
    except Exception as e:
        logger.error(f"pins.delete_pin: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": {"code": "INTERNAL_SERVER_ERROR"}}


@router.get("/{pin_id}/comments")
def get_pin_comments(
    pin_id: Annotated[int, Path()],
    response: Response,
    db: sqlite3.Connection = Depends(get_db),
):
    try:
        sql = """
            SELECT id, user_id, text, created_at, updated_at
            FROM comments
            WHERE pin_id = ?
            ORDER BY id ASC
            LIMIT -1 OFFSET 1
        """
        comments = db.execute(sql, (pin_id,)).fetchall()

        nodes = [dict(comment) for comment in comments]
        if not nodes:
            response.headers["X-Total-Count"] = "0"
            return {"nodes": [], "error": None}

        user_ids = [comment["user_id"] for comment in nodes]
        users = get_users(db, user_ids)

        for node in nodes:
            node["user"] = users.get(node["user_id"])
            del node["user_id"]

        response.headers["X-Total-Count"] = str(len(nodes))
        return {"nodes": nodes, "error": None}
    except Exception as e:
        logger.error(f"pins.pin_comments: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"nodes": [], "error": {"code": "INTERNAL_SERVER_ERROR"}}


class CreateCommentBody(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def strip(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("INVALID")
        return v.strip()


@router.post("/{pin_id}/comments")
def create_comment(
    pin_id: Annotated[int, Path()],
    body: CreateCommentBody,
    response: Response,
    db: sqlite3.Connection = Depends(get_db),
    user_id=Depends(get_user_id),
):
    try:
        sql = "INSERT INTO comments (pin_id, user_id, text) VALUES (?, ?, ?) RETURNING id"
        comment = db.execute(sql, (pin_id, user_id, body.text)).fetchone()
        return {"comment": {"id": comment["id"]}, "error": None}
    except Exception as e:
        logger.error(f"pins.create_comment: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"comment": None, "error": {"code": "INTERNAL_SERVER_ERROR"}}


def get_users(db: sqlite3.Connection, user_ids: list[int]):
    try:
        sql = "SELECT id, name FROM users WHERE id IN ({})".format(",".join("?" * len(user_ids)))
        users = db.execute(sql, user_ids).fetchall()
        return {user["id"]: dict(user) for user in users}
    except Exception as e:
        logger.error(f"pins.get_users: {e}")
        return {}


def get_comments(db: sqlite3.Connection, comment_ids: list[int]):
    try:
        sql = """
            SELECT id, pin_id, text, created_at, updated_at
            FROM comments
            WHERE pin_id IN ({})
            GROUP BY pin_id
            HAVING MIN(created_at)
        """.format(",".join("?" * len(comment_ids)))
        comments = db.execute(sql, comment_ids).fetchall()
        return {
            comment["pin_id"]: {k: comment[k] for k in ("id", "text", "created_at", "updated_at")}
            for comment in comments
        }
    except Exception as e:
        logger.error(f"pins.get_comments: {e}")
        return {}
