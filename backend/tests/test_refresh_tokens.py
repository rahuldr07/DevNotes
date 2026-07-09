from types import SimpleNamespace


def test_login_returns_refresh_token_and_stores_hash(monkeypatch):
    from app.repositories import user_repo
    from app.services import auth_service
    from app.services.security import hash_password, verify_token_hash

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

    assert set(result) == {
        "access_token",
        "refresh_token",
        "token_type",
        "remember_me",
        "refresh_expires_in",
    }
    assert result["token_type"] == "bearer"
    assert result["remember_me"] is False
    assert result["refresh_expires_in"] == 7 * 24 * 60 * 60
    assert saved["user_id"] == 1
    assert saved["refresh_token_hash"] != result["refresh_token"]
    assert verify_token_hash(result["refresh_token"], saved["refresh_token_hash"])


def test_login_creates_session_when_db_available(monkeypatch):
    from app.repositories import session_repo, user_repo
    from app.services import auth_service
    from app.services.security import hash_password, verify_token_hash

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
    assert verify_token_hash(result["refresh_token"], sessions["refresh_token_hash"])
    assert verify_token_hash(result["refresh_token"], saved["refresh_token_hash"])


def test_login_remember_me_extends_refresh_session(monkeypatch):
    from datetime import datetime, timedelta, timezone

    from app.repositories import session_repo, user_repo
    from app.services import auth_service
    from app.services.security import hash_password

    user = SimpleNamespace(id=1, hashed_password=hash_password("abc12345"))
    sessions = {}

    monkeypatch.setattr(user_repo, "get_by_email", lambda db, email: user)
    monkeypatch.setattr(
        user_repo,
        "update_refresh_token",
        lambda db, user_id, refresh_token_hash: None,
        raising=False,
    )
    monkeypatch.setattr(
        session_repo,
        "create",
        lambda db, **kwargs: sessions.update(kwargs),
        raising=False,
    )

    result = auth_service.authenticate_user(
        object(), "ada@example.com", "abc12345", remember_me=True
    )

    assert result["remember_me"] is True
    assert result["refresh_expires_in"] == 30 * 24 * 60 * 60

    payload = auth_service.verify_refresh_token(result["refresh_token"])
    assert payload["remember"] is True

    now = datetime.now(timezone.utc)
    assert sessions["expires_at"] > now + timedelta(days=29)


def test_refresh_preserves_remember_me_duration(monkeypatch):
    from datetime import datetime, timedelta, timezone

    from app.repositories import session_repo, user_repo
    from app.services import auth_service
    from app.services.security import hash_token

    user = SimpleNamespace(id=1, refresh_token=None)
    refresh_token = auth_service.create_refresh_token(
        {"sub": "1", "sid": "session-1", "remember": True},
        expires_days=auth_service.REMEMBER_ME_REFRESH_EXPIRE_DAYS,
    )
    session = SimpleNamespace(
        id="session-1",
        user_id=1,
        refresh_token_hash=hash_token(refresh_token),
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

    assert result["remember_me"] is True
    assert result["refresh_expires_in"] == 30 * 24 * 60 * 60
    assert auth_service.verify_refresh_token(result["refresh_token"])["remember"] is True

    now = datetime.now(timezone.utc)
    assert rotated["expires_at"] > now + timedelta(days=29)


def _login_cookie_test_tokens(remember_me: bool) -> dict:
    days = 30 if remember_me else 7
    return {
        "access_token": "access",
        "refresh_token": "refresh",
        "token_type": "bearer",
        "remember_me": remember_me,
        "refresh_expires_in": days * 24 * 60 * 60,
    }


def _refresh_cookie_header(response) -> str:
    cookies = [
        header
        for header in response.headers.get_list("set-cookie")
        if header.startswith("devnotes_refresh_token=")
    ]
    assert len(cookies) == 1
    return cookies[0]


def test_login_with_remember_me_sets_persistent_refresh_cookie(auth_client, monkeypatch):
    from app.services import auth_service

    monkeypatch.setattr(
        auth_service,
        "authenticate_user",
        lambda db, email, password, **kwargs: _login_cookie_test_tokens(
            kwargs.get("remember_me", False)
        ),
        raising=False,
    )

    response = auth_client.post(
        "/auth/login",
        json={"email": "ada@example.com", "password": "abc12345", "remember_me": True},
    )

    assert response.status_code == 200
    assert response.json()["remember_me"] is True
    assert "Max-Age=2592000" in _refresh_cookie_header(response)


def test_login_without_remember_me_sets_session_refresh_cookie(auth_client, monkeypatch):
    from app.services import auth_service

    monkeypatch.setattr(
        auth_service,
        "authenticate_user",
        lambda db, email, password, **kwargs: _login_cookie_test_tokens(
            kwargs.get("remember_me", False)
        ),
        raising=False,
    )

    response = auth_client.post(
        "/auth/login",
        json={"email": "ada@example.com", "password": "abc12345"},
    )

    assert response.status_code == 200
    assert response.json()["remember_me"] is False
    assert "Max-Age" not in _refresh_cookie_header(response)


def test_refresh_rotates_session_token(monkeypatch):
    from app.repositories import session_repo, user_repo
    from app.services import auth_service
    from app.services.security import hash_token, verify_token_hash

    user = SimpleNamespace(id=1, refresh_token=None)
    refresh_token = auth_service.create_refresh_token({"sub": "1", "sid": "session-1"})
    session = SimpleNamespace(
        id="session-1",
        user_id=1,
        refresh_token_hash=hash_token(refresh_token),
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
    assert verify_token_hash(result["refresh_token"], rotated["refresh_token_hash"])


def test_refresh_rejects_stale_token_after_rotation(monkeypatch):
    """Regression: bcrypt truncates at 72 bytes, so same-session JWTs (identical
    prefix) all passed the old hash check and reuse detection never fired."""
    from app.repositories import session_repo, user_repo
    from app.services import auth_service
    from app.services.security import hash_token
    from fastapi import HTTPException
    import pytest

    user = SimpleNamespace(id=1, refresh_token=None)
    stale_token = auth_service.create_refresh_token({"sub": "1", "sid": "session-1"})
    current_token = auth_service.create_refresh_token({"sub": "1", "sid": "session-1"})
    session = SimpleNamespace(
        id="session-1",
        user_id=1,
        refresh_token_hash=hash_token(current_token),
    )
    revoked = {}

    monkeypatch.setattr(user_repo, "get_by_id", lambda db, user_id: user)
    monkeypatch.setattr(
        session_repo,
        "get_active",
        lambda db, session_id: session,
        raising=False,
    )
    monkeypatch.setattr(
        session_repo,
        "revoke",
        lambda db, **kwargs: revoked.update(kwargs),
        raising=False,
    )

    with pytest.raises(HTTPException) as excinfo:
        auth_service.refresh_access_token(object(), stale_token)

    assert excinfo.value.status_code == 401
    assert revoked["session"] is session


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
        "remember_me": False,
        "refresh_expires_in": 7 * 24 * 60 * 60,
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
