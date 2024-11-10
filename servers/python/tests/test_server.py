def test_missing_headers(raw_client):
    # MISSING_APP_ID should be first
    response = raw_client.get("/headers")
    assert response.status_code == 400
    assert response.json() == {"error": {"code": "MISSING_APP_ID"}}

    # MISSING_USER_ID
    response = raw_client.get("/headers", headers={"Aloy-App-ID": "test"})
    assert response.status_code == 400
    assert response.json() == {"error": {"code": "MISSING_USER_ID"}}

    # MISSING_APP_ID
    response = raw_client.get("/headers", headers={"Aloy-User-ID": "1"})
    assert response.status_code == 400
    assert response.json() == {"error": {"code": "MISSING_APP_ID"}}

    # ok
    response = raw_client.get("/headers", headers={"Aloy-App-ID": "test", "Aloy-User-ID": "1"})
    assert response.status_code == 200
    assert response.json() == {"success": True}
