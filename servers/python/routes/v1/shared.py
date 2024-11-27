import json
import logging
import os
import sqlite3
import time
from dataclasses import dataclass

import thumbhash
from fastapi import HTTPException, UploadFile

import constants
from storage import Storage

logger = logging.getLogger("uvicorn.error")


def get_users(db: sqlite3.Connection, user_ids: list[int]):
    try:
        sql = f"SELECT id, name FROM users WHERE id IN ({",".join("?" * len(user_ids))})"
        users = db.execute(sql, user_ids).fetchall()
        return {user["id"]: dict(user) for user in users}
    except Exception as e:
        logger.error(f"shared.get_users: {e}")
        return {}


def get_comments(db: sqlite3.Connection, comment_ids: list[int]):
    try:
        sql = f"""
            SELECT id, text, created_at, updated_at
            FROM comments
            WHERE id IN ({format(",".join("?" * len(comment_ids)))})
        """
        comments = db.execute(sql, comment_ids).fetchall()
        return {comment["id"]: dict(comment) for comment in comments}
    except Exception as e:
        logger.error(f"shared.get_comments: {e}")
        return {}


@dataclass
class UploadAttachmentResult:
    url: str
    data: dict[str, str]


def upload_attachments(storage: Storage, files: list[UploadFile] | None):
    if files is None or len(files) < 1:
        return []

    if len(files) > constants.ATTACHMENT_MAX_COUNT:
        raise HTTPException(status_code=400, detail={"attachments": "TOO_MANY"})

    results: list[UploadAttachmentResult] = []
    error = {}

    for i, attachment in enumerate(files):
        if attachment.size is not None and attachment.size > constants.ATTACHMENT_MAX_SIZE:
            error[f"attachments.{i}"] = "TOO_BIG"
            continue

        content_type = ""
        if attachment.content_type is not None:
            content_type = attachment.content_type

        if content_type not in constants.ATTACHMENT_SUPPORTED_TYPES:
            error[f"attachments.{i}"] = "UNSUPPORTED"
            continue

        key = f"attachments/{int(time.time() * 1000)}{os.path.splitext(attachment.filename or "")[1]}"
        results.append(
            UploadAttachmentResult(
                f"{constants.ASSETS_BASE_URL}/{key}",
                {
                    "type": content_type,
                    "hash": thumbhash.image_to_thumbhash(attachment.file),
                },
            )
        )

        attachment.file.seek(0)
        storage.upload(attachment.file, key, content_type)

    if error:
        raise HTTPException(status_code=400, detail=error)

    return results


def get_attachments(db: sqlite3.Connection, comment_ids: list[int]):
    try:
        sql = f"""
            SELECT id, comment_id, url, data
            FROM attachments
            WHERE comment_id IN ({format(",".join("?" * len(comment_ids)))})
        """
        attachments = db.execute(sql, comment_ids).fetchall()

        m = {}
        for attachment in attachments:
            key = attachment["comment_id"]
            if key not in m:
                m[key] = []
            m[key].append(
                {
                    "id": attachment["id"],
                    "url": attachment["url"],
                    "data": json.loads(attachment["data"]),
                }
            )

        return m
    except Exception as e:
        logger.error(f"shared.get_attachments: {e}")
        return {}
