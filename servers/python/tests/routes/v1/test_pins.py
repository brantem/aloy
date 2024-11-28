import json
import sqlite3

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from freezegun import freeze_time
from moto import mock_aws

from storage import Storage
from tests.helpers import partial_match

headers = {
    "Aloy-App-ID": "test",
    "Aloy-User-ID": "1",
}


@pytest.fixture(autouse=True)
def prepare(db: sqlite3.Connection, storage: Storage):
    db.executescript("""
        INSERT INTO users VALUES
          ('user-1', 1, 'test', 'User 1'),
          ('user-2', 2, 'test', 'User 2');
        INSERT INTO pins VALUES
          (1, 'test', 1, '/', 'body', 1, 0, 0, 0, 0, CURRENT_TIME, NULL, NULL),
          (2, 'test', 2, '/b', 'body', 1, 0, 0, 0, 0, CURRENT_TIME, CURRENT_TIME, 2);
        INSERT INTO comments VALUES
          (1, 1, 1, 'a', CURRENT_TIME, CURRENT_TIME),
          (2, 2, 2, 'b', CURRENT_TIME, CURRENT_TIME);
        INSERT INTO attachments VALUES (1, 1, 'a.txt', '{"type":"text/plain"}');
    """)
    storage.upload(key="a.txt", file=open("tests/test_data/a.png", "rb"))


def test_get_pins(client: TestClient, db: sqlite3.Connection):
    response = client.get("/v1/pins?me=1&_path=/", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["X-Total-Count"] == "1"
    assert partial_match(
        {
            "nodes": [
                {
                    "id": 1,
                    "user": {
                        "id": 1,
                        "name": "User 1",
                    },
                    "comment": {
                        "id": 1,
                        "text": "a",
                        "attachments": [
                            {
                                "id": 1,
                                "url": "a.txt",
                                "data": {"type": "text/plain"},
                            }
                        ],
                    },
                    "path": "body",
                    "w": 1,
                    "_x": 0,
                    "x": 0,
                    "_y": 0,
                    "y": 0,
                    "completed_at": None,
                    "total_replies": 0,
                }
            ],
            "error": None,
        },
        response.json(),
    )

    response = client.get("/v1/pins?_path=/b", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["X-Total-Count"] == "1"
    assert partial_match(
        {
            "nodes": [
                {
                    "id": 2,
                    "user": {
                        "id": 2,
                        "name": "User 2",
                    },
                    "comment": {
                        "id": 2,
                        "text": "b",
                        "attachments": [],
                    },
                    "path": "body",
                    "w": 1,
                    "_x": 0,
                    "x": 0,
                    "_y": 0,
                    "y": 0,
                    "total_replies": 0,
                }
            ],
            "error": None,
        },
        response.json(),
    )


def test_get_pins_empty(client: TestClient, db: sqlite3.Connection):
    response = client.get("/v1/pins?me=1&_path=/b", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["X-Total-Count"] == "0"
    assert response.json() == {"nodes": [], "error": None}


@freeze_time("2024-01-01")
def test_create_pin(client: TestClient, db: sqlite3.Connection, storage: Storage):
    assert db.execute("SELECT id FROM pins WHERE id = 3").fetchone() is None

    files = [("attachments", open("tests/test_data/a.png", "rb"))]
    response = client.post(
        "/v1/pins",
        headers=headers,
        data={
            "_path": " / ",
            "path": " body ",
            "w": "1",  # str -> float
            "_x": "0",  # str -> float
            "x": "0",  # str -> float
            "_y": "0",  # str -> float
            "y": "0",  # str -> float
            "text": " a ",
        },
        files=files,
    )
    assert response.status_code == status.HTTP_200_OK
    assert partial_match({"pin": {"id": 3}, "error": None}, response.json())

    pin = db.execute("SELECT * FROM pins WHERE id = 3").fetchone()
    assert partial_match(
        {
            "id": 3,
            "app_id": "test",
            "user_id": 1,
            "_path": "/",
            "path": "body",
            "w": 1,
            "_x": 0,
            "x": 0,
            "_y": 0,
            "y": 0,
            "completed_at": None,
            "completed_by_id": None,
        },
        dict(pin),
    )

    comment = db.execute("SELECT * FROM comments WHERE pin_id = ?", (pin["id"],)).fetchone()
    assert partial_match(
        {
            "id": 3,
            "pin_id": 3,
            "user_id": 1,
            "text": "a",
        },
        dict(comment),
    )

    key = "attachments/1704067200000.png"
    attachments = db.execute("SELECT * FROM attachments WHERE comment_id = ?", (comment["id"],)).fetchall()
    assert [dict(attachment) for attachment in attachments] == [
        {
            "id": 2,
            "comment_id": 3,
            "url": "/" + key,
            "data": json.dumps({"type": "image/png", "hash": "Pwh+BwAI9wiIh4hwj3CI+AiIAAAAAAAA"}),
        }
    ]
    assert storage.s3.list_objects(Bucket=storage.bucket, Prefix=key).get("Contents") is not None


def test_complete_pin(client: TestClient, db: sqlite3.Connection):
    pin = db.execute("SELECT completed_at, completed_by_id FROM pins WHERE id = 1").fetchone()
    assert dict(pin) == {"completed_at": None, "completed_by_id": None}

    # complete
    headers = {"Content-Type": "text/plain", "Aloy-App-ID": "test", "Aloy-User-ID": "1"}
    response = client.post("/v1/pins/1/complete", headers=headers, content=b" 1 ")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"success": True, "error": None}

    pin = db.execute("SELECT completed_at, completed_by_id FROM pins WHERE id = 1").fetchone()
    assert pin["completed_at"] is not None
    assert pin["completed_by_id"] == 1

    # uncomplete
    headers = {"Content-Type": "text/plain", "Aloy-App-ID": "test", "Aloy-User-ID": "1"}
    response = client.post("/v1/pins/1/complete", headers=headers, content=b" a ")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"success": True, "error": None}

    pin = db.execute("SELECT completed_at, completed_by_id FROM pins WHERE id = 1").fetchone()
    assert dict(pin) == {"completed_at": None, "completed_by_id": None}


def test_delete_pin(client: TestClient, db: sqlite3.Connection):
    assert [pin["id"] for pin in db.execute("SELECT id FROM pins").fetchall()] == [1, 2]

    response = client.delete("/v1/pins/1", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"success": True, "error": None}

    assert [pin["id"] for pin in db.execute("SELECT id FROM pins").fetchall()] == [2]


def test_get_pin_comments(client: TestClient, db: sqlite3.Connection):
    response = client.get("/v1/pins/1/comments", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["X-Total-Count"] == "0"
    assert response.json() == {"nodes": [], "error": None}

    db.executescript("""
        INSERT INTO comments VALUES
            (3, 1, 1, 'c', CURRENT_TIME, CURRENT_TIME),
            (4, 2, 2, 'd', CURRENT_TIME, CURRENT_TIME);
        INSERT INTO attachments VALUES (2, 3, 'a.txt', '{"type":"text/plain"}');
    """)

    response = client.get("/v1/pins/1/comments", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["X-Total-Count"] == "1"
    assert partial_match(
        {
            "nodes": [
                {
                    "id": 3,
                    "user": {
                        "id": 1,
                        "name": "User 1",
                    },
                    "text": "c",
                    "attachments": [
                        {
                            "id": 2,
                            "url": "a.txt",
                            "data": {"type": "text/plain"},
                        }
                    ],
                }
            ],
            "error": None,
        },
        response.json(),
    )

    response = client.get("/v1/pins/2/comments", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    assert response.headers["X-Total-Count"] == "1"
    assert partial_match(
        {
            "nodes": [
                {
                    "id": 4,
                    "user": {
                        "id": 2,
                        "name": "User 2",
                    },
                    "text": "d",
                    "attachments": [],
                }
            ],
            "error": None,
        },
        response.json(),
    )


@freeze_time("2024-01-01")
@mock_aws
def test_create_comment(client: TestClient, db: sqlite3.Connection, storage: Storage):
    key = "attachments/1704067200000.png"

    assert db.execute("SELECT id FROM comments WHERE id = 3").fetchone() is None
    assert db.execute("SELECT id FROM attachments WHERE comment_id = 3").fetchone() is None
    assert storage.s3.list_objects(Bucket=storage.bucket, Prefix=key).get("Contents") is None

    files = [("attachments", open("tests/test_data/a.png", "rb"))]
    response = client.post("/v1/pins/1/comments", headers=headers, data={"text": " c "}, files=files)
    assert response.status_code == status.HTTP_200_OK
    assert partial_match({"comment": {"id": 3}, "error": None}, response.json())

    comment = db.execute("SELECT * FROM comments WHERE id = 3").fetchone()
    assert partial_match({"id": 3, "pin_id": 1, "user_id": 1, "text": "c"}, dict(comment))

    attachment = db.execute("SELECT id, url, data FROM attachments WHERE comment_id = 3").fetchone()
    assert dict(attachment) == {
        "id": 2,
        "url": "/" + key,
        "data": json.dumps({"type": "image/png", "hash": "Pwh+BwAI9wiIh4hwj3CI+AiIAAAAAAAA"}),
    }
    assert storage.s3.list_objects(Bucket=storage.bucket, Prefix=key).get("Contents") is not None
