def test_auth_me_returns_current_user(auth_client):
    response = auth_client.get("/auth/me", headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "username": "ada-lovelace",
        "bio": None,
        "website_url": None,
        "github_url": None,
        "twitter_url": None,
        "avatar_url": None,
        "role": "user",
        "created_at": "2026-01-01T00:00:00Z",
    }


def test_update_profile_normalizes_and_returns_current_user(auth_client, current_user, monkeypatch):
    from app.services import profile_service

    def fake_update(db, user, **fields):
        for key, value in fields.items():
            setattr(user, key, value)
        return user

    monkeypatch.setattr(profile_service, "update_my_profile", fake_update)

    response = auth_client.patch(
        "/auth/profile",
        json={
            "name": "Ada Byron",
            "username": "Ada-Byron",
            "bio": "  Computing pioneer  ",
            "website_url": "  https://example.com  ",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Ada Byron"
    assert body["username"] == "ada-byron"
    assert body["bio"] == "Computing pioneer"
    assert body["website_url"] == "https://example.com"
