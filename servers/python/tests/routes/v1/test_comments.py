import sqlite3

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from moto import mock_aws

from storage import Storage

headers = {
    "Aloy-App-ID": "test",
    "Aloy-User-ID": "1",
}


@pytest.fixture(autouse=True)
def prepare(db: sqlite3.Connection, storage: Storage):
    db.executescript("""
        INSERT INTO users VALUES ('user-1', 1, '1', 'User 1');
        INSERT INTO pins VALUES (1, 'test', 1, '/', 'body', 1, 0, 0, 0, 0, CURRENT_TIME, NULL, NULL);
        INSERT INTO comments VALUES
          (1, 1, 1, 'a', CURRENT_TIME, CURRENT_TIME),
          (2, 1, 1, 'b', CURRENT_TIME, CURRENT_TIME);
        INSERT INTO attachments VALUES (1, 1, 'a.txt', '{"type":"text/plain"}');
    """)
    storage.upload(key="a.txt", file=open("tests/test_data/a.png", "rb"))


def test_update_comment(client: TestClient, db: sqlite3.Connection):
    assert db.execute("SELECT text FROM comments WHERE id = 1").fetchone()["text"] == "a"

    response = client.patch("/v1/comments/1", headers=headers, json={"text": " aa "})
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"success": True, "error": None}

    assert db.execute("SELECT text FROM comments WHERE id = 1").fetchone()["text"] == "aa"


@mock_aws
def test_delete_comment(client: TestClient, db: sqlite3.Connection, storage: Storage):
    assert [comment["id"] for comment in db.execute("SELECT id FROM comments").fetchall()] == [1, 2]
    assert storage.s3.list_objects(Bucket=storage.bucket, Prefix="a.txt").get("Contents") is not None

    response = client.delete("/v1/comments/1", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"success": True, "error": None}

    assert [comment["id"] for comment in db.execute("SELECT id FROM comments").fetchall()] == [2]
    assert storage.s3.list_objects(Bucket=storage.bucket, Prefix="a.txt").get("Contents") is None
