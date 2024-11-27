import logging
import sqlite3
from typing import Annotated

from anyio import Path
from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, field_validator

import constants
from routes import deps
from storage import Storage

logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/comments", dependencies=[Depends(deps.get_user_id)])


class UpdateCommentBody(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def strip(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("INVALID")
        return v.strip()


@router.patch("/{comment_id}")
def update_comment(
    response: Response,
    comment_id: Annotated[int, Path()],
    body: UpdateCommentBody,
    db: sqlite3.Connection = Depends(deps.get_db),
    user_id=Depends(deps.get_user_id),
):
    try:
        db.execute("UPDATE comments SET text = ? WHERE id = ? AND user_id = ?", (body.text, comment_id, user_id))
        return {"success": True, "error": None}
    except Exception as e:
        logger.error(f"comments.update_comment: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": {"code": "INTERNAL_SERVER_ERROR"}}


@router.delete("/{comment_id}")
def delete_comment(
    response: Response,
    comment_id: Annotated[int, Path()],
    db: sqlite3.Connection = Depends(deps.get_db),
    storage: Storage = Depends(deps.get_storage),
    user_id=Depends(deps.get_user_id),
):
    try:
        attachments = db.execute("SELECT url FROM attachments WHERE comment_id = ?", (comment_id,)).fetchall()
        keys = [attachment["url"].removeprefix(constants.ASSETS_BASE_URL + "/") for attachment in attachments]

        db.execute("DELETE FROM comments WHERE id = ? AND user_id = ?", (comment_id, user_id))
        if len(keys) > 0:
            storage.delete(keys)

        return {"success": True, "error": None}
    except Exception as e:
        logger.error(f"comments.delete_comment: {e}")
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"success": False, "error": {"code": "INTERNAL_SERVER_ERROR"}}
