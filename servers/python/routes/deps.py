import os
import sqlite3
from typing import Annotated

from fastapi import Header


# I have no idea how to put this in its own package
def get_db():
    conn = sqlite3.connect(os.getenv("DB_DSN", "data.db"), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.isolation_level = None
    conn.autocommit = sqlite3.LEGACY_TRANSACTION_CONTROL

    conn.execute("PRAGMA foreign_keys = ON")

    try:
        yield conn
    finally:
        conn.close()


async def get_app_id(aloy_app_id: Annotated[str, Header()]):
    return aloy_app_id


async def get_user_id(aloy_user_id: Annotated[str, Header()]):
    return aloy_user_id
