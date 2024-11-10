import sqlite3


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.isolation_level = None
    conn.autocommit = sqlite3.LEGACY_TRANSACTION_CONTROL

    conn.execute("PRAGMA foreign_keys = ON")

    return conn
