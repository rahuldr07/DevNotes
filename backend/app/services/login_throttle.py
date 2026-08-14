"""Per-account login throttling.

IP-based limits are the wrong tool for credential stuffing here: every request
reaches FastAPI through the Next BFF proxy, so unauthenticated traffic shares
a single apparent address unless a trusted proxy header is configured. A
per-email failure counter does not depend on the client address at all, and it
is the control that actually matters — it protects *one account* from being
guessed rather than rationing the whole app.

Like slowapi's default store this is in-process, so counters are per worker.
That is a weaker bound with N workers, not an absent one; moving both to Redis
is the same follow-up.
"""
from collections import deque
from datetime import datetime, timedelta, timezone
from threading import Lock

from fastapi import HTTPException

MAX_FAILURES = 5
FAILURE_WINDOW = timedelta(minutes=15)
LOCKOUT = timedelta(minutes=15)

_failures: dict[str, deque[datetime]] = {}
_lock = Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _key(email: str) -> str:
    return email.strip().lower()


def _prune(attempts: deque[datetime], now: datetime) -> None:
    cutoff = now - FAILURE_WINDOW
    while attempts and attempts[0] < cutoff:
        attempts.popleft()


def assert_not_locked(email: str) -> None:
    """Raise 429 when this account has too many recent failed attempts."""
    now = _now()
    with _lock:
        attempts = _failures.get(_key(email))
        if not attempts:
            return
        _prune(attempts, now)
        if len(attempts) < MAX_FAILURES:
            return
        retry_after = int((attempts[0] + LOCKOUT - now).total_seconds())

    raise HTTPException(
        status_code=429,
        detail="Too many failed sign-in attempts. Try again in a few minutes.",
        headers={"Retry-After": str(max(retry_after, 1))},
    )


def record_failure(email: str) -> None:
    now = _now()
    with _lock:
        attempts = _failures.setdefault(_key(email), deque())
        _prune(attempts, now)
        attempts.append(now)


def record_success(email: str) -> None:
    with _lock:
        _failures.pop(_key(email), None)


def reset() -> None:
    """Test hook — drops all tracked failures."""
    with _lock:
        _failures.clear()
