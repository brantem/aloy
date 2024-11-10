import sqlite3

from fastapi.testclient import TestClient

from tests.helpers import partial_match


def create_and_check(client: TestClient, db: sqlite3.Connection):
    response = client.post("/v1/users", headers={"Aloy-App-ID": "test"}, json={"id": "user-1", "name": "User 1"})
    assert response.status_code == 200
    assert partial_match({"user": {"id": 1}, "error": None}, response.json())

    users = db.execute("SELECT * FROM users").fetchall()
    assert [dict(user) for user in users] == [{"_id": "user-1", "id": 1, "app_id": "test", "name": "User 1"}]


def test_create_user(client: TestClient, db: sqlite3.Connection):
    assert db.execute("SELECT id FROM users").fetchone() is None
    create_and_check(client, db)
    create_and_check(client, db)  # upsert
