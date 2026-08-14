"""Rate limiting.

The browser never talks to this API directly — every request arrives through
the Next.js BFF proxy. That makes `request.client.host` the *proxy's* address
for the entire user base, so keying limits on it would put every user in one
shared bucket (a 60/minute app-wide ceiling).

So the key is chosen in this order:

1. The authenticated subject from a verified access token. Unspoofable, and
   it covers every route that matters once a user is signed in.
2. The forwarded client address, but only when `TRUST_FORWARDED_FOR` says a
   trusted proxy is the sole ingress and overwrites the header itself.
3. The direct peer address.
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config import get_settings


def _client_address(request: Request) -> str:
    if get_settings().TRUST_FORWARDED_FOR:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # Left-most entry is the original client; the proxy appends hops.
            first = forwarded.split(",")[0].strip()
            if first:
                return first
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
    return get_remote_address(request)


def _subject_from_bearer(request: Request) -> str | None:
    header = request.headers.get("authorization") or ""
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None

    # Imported lazily: auth_service pulls in the ORM layer, and this module is
    # imported by app.main before the models are wired up.
    from app.services.auth_service import access_token_subject

    return access_token_subject(token.strip())


def rate_limit_key(request: Request) -> str:
    subject = _subject_from_bearer(request)
    if subject:
        return f"user:{subject}"
    return f"ip:{_client_address(request)}"


limiter = Limiter(
    key_func=rate_limit_key,
    default_limits=["240/minute"],
    headers_enabled=True,
    retry_after="delta-seconds",
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    response = JSONResponse({"error": "Rate limit exceeded"}, status_code=429)
    current_limit = getattr(request.state, "view_rate_limit", None)
    if current_limit is not None:
        response = request.app.state.limiter._inject_headers(response, current_limit)

    retry_after = response.headers.get("Retry-After", "0")
    return JSONResponse(
        {
            "error": (
                f"Rate limit exceeded, retry after {retry_after} seconds"
            )
        },
        status_code=429,
        headers=dict(response.headers),
    )


def configure_rate_limiting(app) -> None:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
