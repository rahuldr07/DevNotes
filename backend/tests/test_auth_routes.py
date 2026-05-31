def test_auth_me_returns_current_user(auth_client):
    response = auth_client.get("/auth/me", headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "role": "user",
        "created_at": "2026-01-01T00:00:00Z",
    }
