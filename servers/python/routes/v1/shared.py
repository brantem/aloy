import logging
import os
import sqlite3
import time
from typing import TypedDict

import thumbhash
from fastapi import HTTPException, UploadFile

from routes.deps import get_config
from storage import Storage

logger = logging.getLogger("uvicorn.error")


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


class UploadAttachmentResult(TypedDict):
    url: str
    data: dict[str, str]


def upload_attachments(storage: Storage, files: list[UploadFile] | None):
    if files is None or len(files) < 1:
        return []

    config = get_config()

    if len(files) > config.attachment_max_count:
        raise HTTPException(status_code=400, detail={"attachments": "TOO_MANY"})

    results: list[UploadAttachmentResult] = []
    error = {}

    for i, attachment in enumerate(files):
        if attachment.size is not None and attachment.size > config.attachment_max_size:
            error[f"attachments.{i}"] = "TOO_BIG"
            continue

        content_type = ""
        if attachment.content_type is not None:
            content_type = attachment.content_type

        if content_type not in config.attachment_supported_types:
            error[f"attachments.{i}"] = "UNSUPPORTED"
            continue

        key = f"attachments/{int(time.time() * 1000)}{os.path.splitext(attachment.filename or "")[1]}"
        results.append(
            {
                "url": f"{config.assets_base_url}/{key}",
                "data": {
                    "type": content_type,
                    "hash": thumbhash.image_to_thumbhash(attachment.file),
                },
            }
        )

        attachment.file.seek(0)
        storage.upload(attachment.file, key, content_type)

    if error:
        raise HTTPException(status_code=400, detail=error)

    return results
