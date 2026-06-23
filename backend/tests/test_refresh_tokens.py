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


def test_login_creates_session_when_db_available(monkeypatch):
    from app.repositories import session_repo, user_repo
    from app.services import auth_service
    from app.services.security import hash_password, verify_password

    user = SimpleNamespace(id=1, hashed_password=hash_password("abc12345"))
    saved = {}
    sessions = {}

    monkeypatch.setattr(user_repo, "get_by_email", lambda db, email: user)
    monkeypatch.setattr(
        user_repo,
        "update_refresh_token",
        lambda db, user_id, refresh_token_hash: saved.update(
            {"user_id": user_id, "refresh_token_hash": refresh_token_hash}
        ),
        raising=False,
    )
    monkeypatch.setattr(
        session_repo,
        "create",
        lambda db, **kwargs: sessions.update(kwargs),
        raising=False,
    )

    result = auth_service.authenticate_user(object(), "ada@example.com", "abc12345")

    assert sessions["user_id"] == 1
    assert sessions["session_id"]
    assert verify_password(result["refresh_token"], sessions["refresh_token_hash"])
    assert verify_password(result["refresh_token"], saved["refresh_token_hash"])


def test_refresh_rotates_session_token(monkeypatch):
    from app.repositories import session_repo, user_repo
    from app.services import auth_service
    from app.services.security import hash_password, verify_password

    user = SimpleNamespace(id=1, refresh_token=None)
    refresh_token = auth_service.create_refresh_token({"sub": "1", "sid": "session-1"})
    session = SimpleNamespace(
        id="session-1",
        user_id=1,
        refresh_token_hash=hash_password(refresh_token),
    )
    rotated = {}

    monkeypatch.setattr(user_repo, "get_by_id", lambda db, user_id: user)
    monkeypatch.setattr(
        user_repo,
        "update_refresh_token",
        lambda db, user_id, refresh_token_hash: None,
        raising=False,
    )
    monkeypatch.setattr(
        session_repo,
        "get_active",
        lambda db, session_id: session,
        raising=False,
    )
    monkeypatch.setattr(
        session_repo,
        "rotate",
        lambda db, **kwargs: rotated.update(kwargs),
        raising=False,
    )

    result = auth_service.refresh_access_token(object(), refresh_token)

    assert result["refresh_token"] != refresh_token
    assert rotated["session"] is session
    assert verify_password(result["refresh_token"], rotated["refresh_token_hash"])


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


def test_refresh_endpoint_accepts_httponly_cookie(auth_client, monkeypatch):
    from app.services import auth_service

    calls = {}
    monkeypatch.setattr(
        auth_service,
        "refresh_access_token",
        lambda db, refresh_token: calls.update({"refresh_token": refresh_token})
        or {
            "access_token": "cookie-access",
            "refresh_token": "cookie-refresh-rotated",
            "token_type": "bearer",
        },
        raising=False,
    )

    auth_client.cookies.set("devnotes_refresh_token", "cookie-refresh")
    response = auth_client.post("/auth/refresh")

    assert response.status_code == 200
    assert calls == {"refresh_token": "cookie-refresh"}
    assert response.json()["access_token"] == "cookie-access"


def test_refresh_endpoint_rejects_missing_refresh_token(auth_client, monkeypatch):
    from app.services import auth_service

    monkeypatch.setattr(
        auth_service,
        "refresh_access_token",
        lambda db, refresh_token: (_ for _ in ()).throw(
            AssertionError("refresh should not be called")
        ),
        raising=False,
    )

    response = auth_client.post("/auth/refresh")

    assert response.status_code == 401
    assert response.json()["detail"] == "Refresh token missing"


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


def test_logout_endpoint_accepts_httponly_cookie(auth_client, monkeypatch):
    from app.services import auth_service

    calls = {}
    monkeypatch.setattr(
        auth_service,
        "logout_refresh_token",
        lambda db, refresh_token: calls.update({"refresh_token": refresh_token}),
        raising=False,
    )

    auth_client.cookies.set("devnotes_refresh_token", "cookie-refresh")
    response = auth_client.post("/auth/logout")

    assert response.status_code == 204
    assert calls == {"refresh_token": "cookie-refresh"}


def test_logout_endpoint_succeeds_without_refresh_token(auth_client, monkeypatch):
    from app.services import auth_service

    monkeypatch.setattr(
        auth_service,
        "logout_refresh_token",
        lambda db, refresh_token: (_ for _ in ()).throw(
            AssertionError("logout should not be called")
        ),
        raising=False,
    )

    response = auth_client.post("/auth/logout")

    assert response.status_code == 204
