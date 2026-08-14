"""Access and refresh tokens share a signing key — they must not be interchangeable."""
import pytest
from jose import JWTError


def test_access_token_carries_an_explicit_type():
    from app.services.auth_service import ACCESS_TOKEN_TYPE, create_access_token, verify_access_token

    payload = verify_access_token(create_access_token({"sub": "7"}))

    assert payload["sub"] == "7"
    assert payload["token_type"] == ACCESS_TOKEN_TYPE


def test_refresh_token_is_rejected_on_the_access_path():
    """A stolen or rotated-out refresh token would otherwise authenticate for
    its full 7-30 day life, outliving logout and session revocation."""
    from app.services.auth_service import create_refresh_token, verify_access_token

    refresh = create_refresh_token({"sub": "7", "sid": "session-1"})

    with pytest.raises(JWTError):
        verify_access_token(refresh)


def test_access_token_is_rejected_on_the_refresh_path():
    from app.services.auth_service import create_access_token, verify_refresh_token

    with pytest.raises(JWTError):
        verify_refresh_token(create_access_token({"sub": "7"}))


def test_legacy_tokens_without_a_type_claim_still_verify():
    """Tokens minted before token_type existed must not be invalidated by a
    deploy — that would sign every active session out mid-request."""
    from jose import jwt

    from app.config import get_settings
    from app.services.auth_service import verify_access_token

    settings = get_settings()
    from datetime import datetime, timedelta, timezone

    legacy = jwt.encode(
        {"sub": "7", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    assert verify_access_token(legacy)["sub"] == "7"


def test_current_user_dependency_refuses_a_refresh_token(monkeypatch):
    from fastapi import HTTPException

    from app.dependencies import get_current_user
    from app.services.auth_service import create_refresh_token

    with pytest.raises(HTTPException) as exc:
        get_current_user(token=create_refresh_token({"sub": "7"}), db=None)

    assert exc.value.status_code == 401
