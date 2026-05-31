from types import SimpleNamespace


def test_login_returns_refresh_token_and_stores_hash(monkeypatch):
    from app.repositories import user_repo
    from app.services import auth_service
    from app.services.security import hash_password, verify_password

    user = SimpleNamespace(id=1, hashed_password=hash_password("abc12345"))
    saved = {}

    monkeypatch.setattr(user_repo, "get_by_email", lambda db, email: user)
    monkeypatch.setattr(
        user_repo,
        "update_refresh_token",
        lambda db, user_id, refresh_token_hash: saved.update(
            {"user_id": user_id, "refresh_token_hash": refresh_token_hash}
        ),
        raising=False,
    )

    result = auth_service.authenticate_user(None, "ada@example.com", "abc12345")

    assert set(result) == {"access_token", "refresh_token", "token_type"}
    assert result["token_type"] == "bearer"
    assert saved["user_id"] == 1
    assert saved["refresh_token_hash"] != result["refresh_token"]
    assert verify_password(result["refresh_token"], saved["refresh_token_hash"])


def test_refresh_endpoint_returns_rotated_tokens(auth_client, monkeypatch):
    from app.services import auth_service

    monkeypatch.setattr(
        auth_service,
        "refresh_access_token",
        lambda db, refresh_token: {
            "access_token": "new-access",
            "refresh_token": "new-refresh",
            "token_type": "bearer",
        },
        raising=False,
    )

    response = auth_client.post("/auth/refresh", json={"refresh_token": "old-refresh"})

    assert response.status_code == 200
    assert response.json() == {
        "access_token": "new-access",
        "refresh_token": "new-refresh",
        "token_type": "bearer",
    }


def test_logout_endpoint_clears_refresh_token(auth_client, monkeypatch):
    from app.services import auth_service

    calls = {}
    monkeypatch.setattr(
        auth_service,
        "logout_refresh_token",
        lambda db, refresh_token: calls.update({"refresh_token": refresh_token}),
        raising=False,
    )

    response = auth_client.post("/auth/logout", json={"refresh_token": "refresh"})

    assert response.status_code == 204
    assert calls == {"refresh_token": "refresh"}
