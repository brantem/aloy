import os
from dataclasses import dataclass
from typing import Annotated

from fastapi import Header
from humanfriendly import parse_size

import db
from storage import Storage


# I have no idea how to put this in its own package
def get_db():
    conn = db.connect(os.getenv("DB_PATH", "data.db"))

    try:
        yield conn
    finally:
        conn.close()


def get_storage():
    return Storage()


@dataclass
class Config:
    assets_base_url: str

    attachment_max_count: int
    attachment_max_size: int
    attachment_supported_types: list[str]


def get_config():
    attachment_supported_types = os.getenv("ATTACHMENT_SUPPORTED_TYPES", "image/gif,image/jpeg,image/png,image/webp")
    return Config(
        assets_base_url=os.getenv("ASSETS_BASE_URL", ""),
        attachment_max_count=int(os.getenv("ATTACHMENT_MAX_COUNT", "3")),
        attachment_max_size=parse_size(os.getenv("ATTACHMENT_MAX_SIZE", "100kb")),
        attachment_supported_types=attachment_supported_types.split(","),
    )


def get_app_id(aloy_app_id: Annotated[str, Header()]):
    return aloy_app_id


def get_user_id(aloy_user_id: Annotated[str, Header()]):
    return aloy_user_id
