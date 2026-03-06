import pytest

def test_missing_auth_header(client):
    response = client.post('/api/v1/availability/check', json={"date": "2026-05-10"})
    assert response.status_code == 401
    assert "Unauthorized" in response.get_json()["error"]

def test_invalid_auth_header(client):
    response = client.post(
        '/api/v1/availability/check', 
        json={"date": "2026-05-10"},
        headers={"Authorization": "Bearer BAD_TOKEN"}
    )
    assert response.status_code == 401
    assert "Invalid or expired token" in response.get_json()["error"]

def test_dev_bypass_auth_header(client):
    # Tests that using DEV_BYPASS_TOKEN lets it pass the auth layer
    response = client.post(
        '/api/v1/availability/check', 
        json={"date": "2026-05-10"},
        headers={"Authorization": "Bearer DEV_BYPASS_TOKEN"}
    )
    # 200 means auth passed
    assert response.status_code == 200
