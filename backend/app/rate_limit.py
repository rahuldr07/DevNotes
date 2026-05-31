from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],
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
