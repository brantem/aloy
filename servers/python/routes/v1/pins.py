import json
import logging
import sqlite3
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Request, Response, UploadFile, status
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, ValidationError, field_validator
from pypika import Query, Table

from routes import deps
from routes.v1 import shared
from storage import Storage

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/pins", dependencies=[Depends(deps.get_user_id)])


@router.get("/")
def get_pins(
    response: Response,
    db: sqlite3.Connection = Depends(deps.get_db),
    app_id=Depends(deps.get_app_id),
    _user_id=Depends(deps.get_user_id),
    me: int | None = None,
    _path: str | None = None,
):
    user_id = None
    if me == 1:
        user_id = _user_id

    try:
        sql = """
            WITH t AS (
              SELECT id, pin_id
              FROM comments
              GROUP BY pin_id
              HAVING MIN(created_at)
            )
            SELECT
              p.id, p.user_id, t.id AS comment_id, p.path, p.w, p._x, p.x, p._y, p.y, p.completed_at,
              (SELECT COUNT(c.id)-1 FROM comments c WHERE c.pin_id = p.id) AS total_replies
            FROM pins p
            JOIN t ON t.pin_id = p.id
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
        users = shared.get_users(db, user_ids)

        comment_ids = [pin["comment_id"] for pin in pins]
        comments = shared.get_comments(db, comment_ids)
        attachments = shared.get_attachments(db, comment_ids)

        for node in nodes:
            node["user"] = users.get(node["user_id"])
            del node["user_id"]

            node["comment"] = comments.get(node["comment_id"])
            if node["comment"] is not None:
                node["comment"]["attachments"] = attachments.get(node["comment_id"])
                if node["comment"]["attachments"] is None:
                    node["comment"]["attachments"] = []
            del node["comment_id"]

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
    request: Request,
    response: Response,
    attachments: list[UploadFile] | None = None,
    db: sqlite3.Connection = Depends(deps.get_db),
    storage: Storage = Depends(deps.get_storage),
    app_id=Depends(deps.get_app_id),
    user_id=Depends(deps.get_user_id),
):
    try:
        form_data = await request.form()
        body = CreatePinBody.model_validate(dict(form_data))
    except ValidationError as e:
        raise RequestValidationError(e.errors())

    try:
        upload_attachment_results = shared.upload_attachments(storage, attachments)

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

        sql = "INSERT INTO comments (pin_id, user_id, text) VALUES (?, ?, ?) RETURNING id"
        comment = db.execute(sql, (pin["id"], user_id, body.text)).fetchone()

        if len(upload_attachment_results) > 0:
            q = Query.into(Table("attachments")).columns("comment_id", "url", "data")
            for result in upload_attachment_results:
                q = q.insert(comment["id"], result["url"], json.dumps(result["data"]))
            db.execute(q.get_sql())

        db.commit()
        return {"pin": {"id": pin["id"]}, "error": None}
    except HTTPException as e:
        response.status_code = e.status_code
        return {"comment": None, "error": e.detail}
    except Exception as e:
        logger.error(f"pins.create_pin: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"pin": None, "error": {"code": "INTERNAL_SERVER_ERROR"}}


@router.post("/{pin_id}/complete")
def complete_pin(
    response: Response,
    pin_id: Annotated[int, Path()],
    body: str = Body(default=""),
    db: sqlite3.Connection = Depends(deps.get_db),
    user_id=Depends(deps.get_user_id),
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
    response: Response,
    pin_id: Annotated[int, Path()],
    db: sqlite3.Connection = Depends(deps.get_db),
    user_id=Depends(deps.get_user_id),
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
    response: Response,
    pin_id: Annotated[int, Path()],
    db: sqlite3.Connection = Depends(deps.get_db),
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
        users = shared.get_users(db, user_ids)

        comment_ids = [comment["id"] for comment in nodes]
        attachments = shared.get_attachments(db, comment_ids)

        for node in nodes:
            node["user"] = users.get(node["user_id"])
            del node["user_id"]

            node["attachments"] = attachments.get(node["id"])
            if node["attachments"] is None:
                node["attachments"] = []
            del node["id"]

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
async def create_comment(
    request: Request,
    response: Response,
    pin_id: Annotated[int, Path()],
    attachments: list[UploadFile] | None = None,
    db: sqlite3.Connection = Depends(deps.get_db),
    storage: Storage = Depends(deps.get_storage),
    user_id=Depends(deps.get_user_id),
):
    try:
        form_data = await request.form()
        body = CreateCommentBody.model_validate(dict(form_data))
    except ValidationError as e:
        raise RequestValidationError(e.errors())

    try:
        upload_attachment_results = shared.upload_attachments(storage, attachments)

        sql = "INSERT INTO comments (pin_id, user_id, text) VALUES (?, ?, ?) RETURNING id"
        comment = db.execute(sql, (pin_id, user_id, body.text)).fetchone()

        if len(upload_attachment_results) > 0:
            q = Query.into(Table("attachments")).columns("comment_id", "url", "data")
            for result in upload_attachment_results:
                q = q.insert(comment["id"], result["url"], json.dumps(result["data"]))
            db.execute(q.get_sql())

        db.commit()
        return {"comment": {"id": comment["id"]}, "error": None}
    except HTTPException as e:
        response.status_code = e.status_code
        return {"comment": None, "error": e.detail}
    except Exception as e:
        logger.error(f"pins.create_comment: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"comment": None, "error": {"code": "INTERNAL_SERVER_ERROR"}}
