import os
from typing import Annotated

from fastapi import Header

import db


# I have no idea how to put this in its own package
def get_db():
    conn = db.connect(os.getenv("DB_DSN", "data.db"))

    try:
        yield conn
    finally:
        conn.close()


async def get_app_id(aloy_app_id: Annotated[str, Header()]):
    return aloy_app_id


async def get_user_id(aloy_user_id: Annotated[str, Header()]):
    return aloy_user_id
