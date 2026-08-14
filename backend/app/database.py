from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from app.config import get_settings

settings = get_settings()

# ============================================
# ENGINE — The connection to Aurora PostgreSQL
# ============================================
#
# Think of the engine as a "connection manager". 
# It maintains a POOL of connections so you don't 
# open/close a new connection for every single query.
#
# Why each setting matters for Aurora specifically:

engine = create_engine(
    settings.DATABASE_URL,

    # --- Pool Size ---
    # Keep 10 connections always open and ready.
    # Aurora provisioned instances have connection limits based on instance size.
    # db.r6g.large = ~1000 max connections
    # db.r6g.xlarge = ~2000 max connections
    pool_size=settings.DB_POOL_SIZE,

    # --- Max Overflow ---
    # If all 10 connections are busy, allow up to 20 MORE temporary ones.
    # These extra connections are closed when no longer needed.
    # So worst case: 10 + 20 = 30 simultaneous connections.
    max_overflow=settings.DB_MAX_OVERFLOW,

    # --- Pool Timeout ---
    # If all 30 connections are busy, wait up to 30 seconds
    # for one to free up. After that, raise an error.
    pool_timeout=settings.DB_POOL_TIMEOUT,

    # --- Pool Recycle ---
    # Close and replace connections older than 30 minutes (1800 seconds).
    # WHY? Aurora silently drops idle connections on its side.
    # Without this, you'd get "connection closed unexpectedly" errors.
    pool_recycle=settings.DB_POOL_RECYCLE,

    # --- Pre Ping --- ⭐ CRITICAL FOR AURORA
    # Before using a connection, send a quick "SELECT 1" to check if it's alive.
    # Aurora can FAILOVER (switch writer node) at any time.
    # Without pre_ping, your app would use a dead connection and crash.
    # With pre_ping, SQLAlchemy detects the dead connection, discards it,
    # and grabs a fresh one — your app never notices the failover.
    pool_pre_ping=True,

    # --- Echo ---
    # Set True to print every SQL query to console (useful for debugging)
    # Set False in production
    echo=False,
)


# ============================================
# SESSION FACTORY
# ============================================
#
# SessionLocal is NOT a session — it's a FACTORY that creates sessions.
# Each API request gets its own session (created in dependencies.py).
#
# autocommit=False → You must explicitly call db.commit()
# autoflush=False  → Changes aren't sent to DB until you explicitly flush/commit
#                     This gives you more control and prevents surprises.

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    # Attributes stay loaded after commit, so a handler can serialize the
    # object it just wrote without the ORM issuing a fresh SELECT per row.
    expire_on_commit=False,
)


# ============================================
# TRANSACTION BOUNDARY
# ============================================
#
# Repositories only stage and flush; services decide what a unit of work is.
# Before this, every repository call committed on its own, so a service that
# touched two tables (update a note, snapshot its previous version) could
# leave half the change behind if the second write failed.
#
# Usage:
#     with transaction(db):
#         note = note_repo.update(db, ...)
#         note_repo.create_note_version(db, ...)
#
# One commit at the end, one rollback if anything raises.

@contextmanager
def transaction(db: Session | None) -> Iterator[Session | None]:
    """Commit on clean exit, roll back on any exception.

    `db` may be None: service-layer unit tests inject a null session and
    monkeypatch the repositories, so there is nothing to commit. Request
    handlers always receive a real Session from `get_db`.
    """
    if db is None:
        yield db
        return

    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise


# ============================================
# BASE CLASS FOR MODELS
# ============================================
#
# Every model (Note, User, etc.) will inherit from this.
# SQLAlchemy uses this to track all your tables.

class Base(DeclarativeBase):
    pass
