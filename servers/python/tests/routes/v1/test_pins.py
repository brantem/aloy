import sqlite3

from fastapi.testclient import TestClient

from tests.helpers import partial_match


def prepare(db: sqlite3.Connection):
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
    """)


def test_get_pins(client: TestClient, db: sqlite3.Connection):
    prepare(db)

    response = client.get("/v1/pins?me=1&_path=/", headers={"Aloy-App-ID": "test", "Aloy-User-ID": "1"})
    assert response.status_code == 200
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


def test_get_pins_empty(client: TestClient, db: sqlite3.Connection):
    prepare(db)

    response = client.get("/v1/pins?me=1&_path=/b", headers={"Aloy-App-ID": "test", "Aloy-User-ID": "1"})
    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "0"
    assert response.json() == {"nodes": [], "error": None}


def test_create_pin(client: TestClient, db: sqlite3.Connection):
    db.executescript("INSERT INTO users VALUES ('user-1', 1, 'test', 'User 1')")

    assert db.execute("SELECT id FROM pins").fetchone() is None

    response = client.post(
        "/v1/pins",
        headers={"Aloy-App-ID": "test", "Aloy-User-ID": "1"},
        json={
            "_path": "/",
            "path": "body",
            "w": 1,
            "_x": 0,
            "x": 0,
            "_y": 0,
            "y": 0,
            "text": "a",
        },
    )
    assert response.status_code == 200
    assert partial_match({"pin": {"id": 1}, "error": None}, response.json())

    pins = db.execute("SELECT * FROM pins").fetchall()
    assert partial_match(
        [
            {
                "id": 1,
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
            }
        ],
        [dict(pin) for pin in pins],
    )

    pins = db.execute("SELECT * FROM comments").fetchall()
    assert partial_match(
        [
            {
                "id": 1,
                "pin_id": 1,
                "user_id": 1,
                "text": "a",
            }
        ],
        [dict(pin) for pin in pins],
    )


def test_complete_pin(client: TestClient, db: sqlite3.Connection):
    prepare(db)

    pin = db.execute("SELECT completed_at, completed_by_id FROM pins WHERE id = 1").fetchone()
    assert dict(pin) == {"completed_at": None, "completed_by_id": None}

    # complete
    headers = {"Content-Type": "text/plain", "Aloy-App-ID": "test", "Aloy-User-ID": "1"}
    response = client.post("/v1/pins/1/complete", headers=headers, content=b"1")
    assert response.status_code == 200
    assert response.json() == {"success": True, "error": None}

    pin = db.execute("SELECT completed_at, completed_by_id FROM pins WHERE id = 1").fetchone()
    assert pin["completed_at"] is not None
    assert pin["completed_by_id"] == 1

    # uncomplete
    headers = {"Content-Type": "text/plain", "Aloy-App-ID": "test", "Aloy-User-ID": "1"}
    response = client.post("/v1/pins/1/complete", headers=headers, content=b"0")
    assert response.status_code == 200
    assert response.json() == {"success": True, "error": None}

    pin = db.execute("SELECT completed_at, completed_by_id FROM pins WHERE id = 1").fetchone()
    assert dict(pin) == {"completed_at": None, "completed_by_id": None}


def test_delete_pin(client: TestClient, db: sqlite3.Connection):
    prepare(db)

    assert [pin["id"] for pin in db.execute("SELECT id FROM pins").fetchall()] == [1, 2]

    response = client.delete("/v1/pins/1", headers={"Aloy-App-ID": "test", "Aloy-User-ID": "1"})
    assert response.status_code == 200
    assert response.json() == {"success": True, "error": None}

    assert [pin["id"] for pin in db.execute("SELECT id FROM pins").fetchall()] == [2]


def test_get_pin_comments(client: TestClient, db: sqlite3.Connection):
    prepare(db)

    response = client.get("/v1/pins/1/comments", headers={"Aloy-App-ID": "test", "Aloy-User-ID": "1"})
    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "0"
    assert response.json() == {"nodes": [], "error": None}

    db.execute("INSERT INTO comments VALUES (3, 1, 1, 'c', CURRENT_TIME, CURRENT_TIME);")

    response = client.get("/v1/pins/1/comments", headers={"Aloy-App-ID": "test", "Aloy-User-ID": "1"})
    assert response.status_code == 200
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
                }
            ],
            "error": None,
        },
        response.json(),
    )


def test_create_comment(client: TestClient, db: sqlite3.Connection):
    prepare(db)

    assert db.execute("SELECT id FROM comments WHERE id = 3").fetchone() is None

    response = client.post(
        "/v1/pins/1/comments",
        headers={"Aloy-App-ID": "test", "Aloy-User-ID": "1"},
        json={"text": "c"},
    )
    assert response.status_code == 200
    assert partial_match({"comment": {"id": 3}, "error": None}, response.json())

    comment = db.execute("SELECT * FROM comments WHERE id = 3").fetchone()
    assert partial_match({"id": 3, "pin_id": 1, "user_id": 1, "text": "c"}, dict(comment))
