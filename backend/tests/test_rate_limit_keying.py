"""Rate limits must not put every user in one bucket behind the BFF proxy."""
import pytest
from fastapi import Request


def _request(headers: dict[str, str], client_host: str = "10.0.0.1") -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/notes/notes",
        "headers": [
            (key.lower().encode(), value.encode()) for key, value in headers.items()
        ],
        "client": (client_host, 51234),
        "query_string": b"",
    }
    return Request(scope)


def test_authenticated_requests_key_on_the_user_not_the_proxy_ip():
    from app.rate_limit import rate_limit_key
    from app.services.auth_service import create_access_token

    ada = create_access_token({"sub": "1"})
    grace = create_access_token({"sub": "2"})

    # Same proxy address — the only address FastAPI ever sees in production.
    ada_key = rate_limit_key(_request({"authorization": f"Bearer {ada}"}))
    grace_key = rate_limit_key(_request({"authorization": f"Bearer {grace}"}))

    assert ada_key == "user:1"
    assert grace_key == "user:2"
    assert ada_key != grace_key


def test_anonymous_requests_fall_back_to_the_peer_address():
    from app.rate_limit import rate_limit_key

    assert rate_limit_key(_request({})) == "ip:10.0.0.1"


def test_malformed_bearer_tokens_do_not_raise():
    from app.rate_limit import rate_limit_key

    assert rate_limit_key(_request({"authorization": "Bearer not-a-jwt"})) == "ip:10.0.0.1"
    assert rate_limit_key(_request({"authorization": "Basic abc"})) == "ip:10.0.0.1"


def test_refresh_token_is_not_accepted_as_a_rate_limit_identity():
    from app.rate_limit import rate_limit_key
    from app.services.auth_service import create_refresh_token

    refresh = create_refresh_token({"sub": "1", "sid": "abc"})

    assert rate_limit_key(_request({"authorization": f"Bearer {refresh}"})) == "ip:10.0.0.1"


def test_forwarded_for_is_ignored_unless_explicitly_trusted(monkeypatch):
    from app import rate_limit

    settings = rate_limit.get_settings()
    monkeypatch.setattr(settings, "TRUST_FORWARDED_FOR", False)
    assert (
        rate_limit.rate_limit_key(_request({"x-forwarded-for": "203.0.113.9"}))
        == "ip:10.0.0.1"
    )

    monkeypatch.setattr(settings, "TRUST_FORWARDED_FOR", True)
    assert (
        rate_limit.rate_limit_key(_request({"x-forwarded-for": "203.0.113.9, 10.0.0.1"}))
        == "ip:203.0.113.9"
    )


@pytest.fixture(autouse=True)
def _clear_throttle():
    from app.services import login_throttle

    login_throttle.reset()
    yield
    login_throttle.reset()


def test_login_throttle_locks_a_single_account_after_repeated_failures():
    from fastapi import HTTPException

    from app.services import login_throttle

    for _ in range(login_throttle.MAX_FAILURES):
        login_throttle.assert_not_locked("ada@example.com")
        login_throttle.record_failure("ada@example.com")

    with pytest.raises(HTTPException) as exc:
        login_throttle.assert_not_locked("ada@example.com")
    assert exc.value.status_code == 429
    assert "Retry-After" in exc.value.headers

    # A different account is unaffected — this is per-account, not global.
    login_throttle.assert_not_locked("grace@example.com")


def test_successful_login_clears_the_failure_counter():
    from app.services import login_throttle

    for _ in range(login_throttle.MAX_FAILURES - 1):
        login_throttle.record_failure("ada@example.com")
    login_throttle.record_success("ada@example.com")

    for _ in range(login_throttle.MAX_FAILURES - 1):
        login_throttle.assert_not_locked("ada@example.com")
        login_throttle.record_failure("ada@example.com")

    login_throttle.assert_not_locked("ada@example.com")


def test_throttle_is_case_and_whitespace_insensitive():
    from fastapi import HTTPException

    from app.services import login_throttle

    for _ in range(login_throttle.MAX_FAILURES):
        login_throttle.record_failure("  Ada@Example.com ")

    with pytest.raises(HTTPException):
        login_throttle.assert_not_locked("ada@example.com")
