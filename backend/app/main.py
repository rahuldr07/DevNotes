"""
DevNotes API — FastAPI application entry point.

This is the main file that:
1. Creates the FastAPI app instance
2. Configures CORS middleware (allows frontend at localhost:3000)
3. Registers all route handlers (auth, notes)
4. Tests the Aurora PostgreSQL connection on startup
5. Provides health check endpoints for monitoring

Run with: cd backend && uvicorn app.main:app --reload

Architecture:
    Browser → Next.js (/api proxy) → THIS APP → Aurora PostgreSQL
    
    Request flow within this app:
    main.py (CORS + routing) → routers/ (endpoints) → services/ (business logic)
    → repositories/ (database queries) → models/ (ORM) → PostgreSQL
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text

from app.database import engine
from app.config import get_settings
from app.rate_limit import configure_rate_limiting

# ── Import routers ──
from app.routers import auth
from app.routers import notes
from app.routers import profiles
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on app startup and shutdown.

    Startup:  Test the Aurora connection — fail fast if DB is unreachable.
    Shutdown: Clean up the connection pool.
    """
    # ── STARTUP ──
    settings = get_settings()
    # Refuse to serve traffic with a placeholder secret or plaintext DB link.
    settings.validate_for_runtime()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"Connected to PostgreSQL at {settings.DB_HOST}")
    except Exception as e:
        print(f"Database connection failed: {e}")
        print("   Check: local PostgreSQL service, credentials, endpoint URL")
        raise

    yield  # ← App runs here, handles all requests

    # ── SHUTDOWN ──
    engine.dispose()
    print("Connection pool closed.")


# ── Create the app ──
# The interactive docs describe every endpoint and accept credentials, so they
# are development/staging tooling — off in production.
_settings = get_settings()
app = FastAPI(
    title="DevNotes API",
    lifespan=lifespan,
    docs_url=None if _settings.is_production else "/docs",
    redoc_url=None if _settings.is_production else "/redoc",
    openapi_url=None if _settings.is_production else "/openapi.json",
)
configure_rate_limiting(app)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Pydantic v2 puts the raw exception object in ctx for custom validators,
    # which json.dumps cannot serialize — keep only the JSON-safe fields.
    errors = [
        {
            "loc": [str(part) for part in error.get("loc", [])],
            "msg": str(error.get("msg", "Invalid value")),
            "type": str(error.get("type", "value_error")),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation failed",
            "errors": errors,
            "hint": "Check the marked fields and try again.",
        },
    )


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Database temporarily unavailable",
            "hint": "Retry in a moment. If it keeps failing, check the backend database connection.",
        },
    )

# ── CORS Middleware ──
# With the BFF proxy pattern the browser talks to Next.js, never to FastAPI,
# so production usually wants CORS_ORIGINS empty. It stays configurable for
# direct API access during development and for Swagger UI testing at /docs.
_cors_origins = _settings.cors_origins
if _cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins,
        allow_credentials=True,  # Allow cookies/auth headers
        allow_methods=["*"],     # Allow all HTTP methods
        allow_headers=["*"],     # Allow all headers (including Authorization)
    )

# ── Register routers ──
app.include_router(auth.router)
app.include_router(notes.router)
app.include_router(profiles.router)


# ── Health checks ──
@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/health/db")
def health_db():
    """
    Deep health check — actually queries the database.
    Use this for load balancer health checks.

    Returns 503 (not 200) when the query fails, so a load balancer actually
    takes the instance out of rotation instead of reading a healthy status
    line with an unhealthy body.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"database": "healthy"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={
                "database": "unhealthy",
                "hint": "The API cannot reach PostgreSQL.",
            },
        )
