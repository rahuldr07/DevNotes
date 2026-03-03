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
from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine
from app.config import get_settings

# ── Import routers ──
from app.routers import auth
from app.routers import notes
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
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"✅ Connected to Aurora PostgreSQL at {settings.DB_HOST}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("   Check: VPC/Security Groups, credentials, endpoint URL")
        raise

    yield  # ← App runs here, handles all requests

    # ── SHUTDOWN ──
    engine.dispose()
    print("🔌 Connection pool closed.")


# ── Create the app ──
app = FastAPI(title="DevNotes API", lifespan=lifespan)

# ── CORS Middleware ──
# Allows the Next.js frontend (localhost:3000) to call this API.
# With the BFF proxy pattern, CORS is technically no longer needed
# (browser talks to Next.js, not directly to FastAPI).
# Kept here as a fallback for direct API access during development
# and for Swagger UI testing at /docs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Only allow this origin
    allow_credentials=True,  # Allow cookies/auth headers
    allow_methods=["*"],     # Allow all HTTP methods
    allow_headers=["*"],     # Allow all headers (including Authorization)
)

# ── Register routers ──
app.include_router(auth.router)
app.include_router(notes.router)  # ← uncomment after building notes router


# ── Health checks ──
@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/health/db")
def health_db():
    """
    Deep health check — actually queries Aurora.
    Use this for load balancer health checks.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"database": "healthy"}
    except Exception as e:
        return {"database": "unhealthy", "error": str(e)}

