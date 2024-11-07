import sqlite3
from contextlib import contextmanager


class Database:
    def __init__(self, path: str):
        self.path = path

    @contextmanager
    def get(self):
        conn = None
        try:
            conn = sqlite3.connect(self.path)
            conn.row_factory = sqlite3.Row
            yield conn
        finally:
            if conn:
                conn.close()
