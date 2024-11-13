from fastapi import status


def test_missing_headers(mock_client):
    # MISSING_APP_ID should be first
    response = mock_client.get("/headers")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": {"code": "MISSING_APP_ID"}}

    # MISSING_USER_ID
    response = mock_client.get("/headers", headers={"Aloy-App-ID": "test"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": {"code": "MISSING_USER_ID"}}

    # MISSING_APP_ID
    response = mock_client.get("/headers", headers={"Aloy-User-ID": "1"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": {"code": "MISSING_APP_ID"}}

    # ok
    response = mock_client.get("/headers", headers={"Aloy-App-ID": "test", "Aloy-User-ID": "1"})
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"success": True}


def test_validation(mock_client):
    # REQUIRED
    response = mock_client.post("/validation", json={})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": {"text": "REQUIRED"}}

    # INVALID
    response = mock_client.post("/validation", json={"text": " "})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"error": {"text": "INVALID"}}

    # ok
    response = mock_client.post("/validation", json={"text": " a "})
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"text": "a"}
