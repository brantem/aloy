import logging
import sqlite3

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
