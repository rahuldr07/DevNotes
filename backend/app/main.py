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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

