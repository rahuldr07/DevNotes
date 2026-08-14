"""Integration tests against a real PostgreSQL database.

Everything in `tests/` outside this package overrides `get_db` with None and
monkeypatches the repositories, which means the Postgres-only half of the
codebase — every Alembic migration, the generated `search_vector` column and
its GIN index, `websearch_to_tsquery` ranking, array containment on tags,
`unnest` aggregates, the unique constraints — was never executed by a test.
This package runs it for real.

Point it at a database with `TEST_DATABASE_URL`, or let it build one from the
`TEST_DB_*` variables. Without a reachable server the whole package skips, so
`pytest` stays runnable on a laptop with no database; CI always provides one.
"""
import os
import subprocess
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[2]


def _database_url() -> str:
    explicit = os.getenv("TEST_DATABASE_URL")
    if explicit:
        return explicit
    host = os.getenv("TEST_DB_HOST", "localhost")
    port = os.getenv("TEST_DB_PORT", "5432")
    name = os.getenv("TEST_DB_NAME", "devnotes_test")
    user = os.getenv("TEST_DB_USER", "devnotes")
    password = os.getenv("TEST_DB_PASSWORD", "devnotes")
    return f"postgresql://{user}:{password}@{host}:{port}/{name}"


@pytest.fixture(scope="session")
def database_url() -> str:
    url = _database_url()
    # Short connect timeout: on a machine with no database the whole package
    # should skip in a second or two, not stall on a TCP connect.
    engine = create_engine(url, connect_args={"connect_timeout": 3})
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - environment dependent
        message = f"No PostgreSQL available for integration tests: {exc}"
        # CI sets REQUIRE_INTEGRATION_DB so a misconfigured service container
        # fails the build. A silent skip is how the Postgres-only half of the
        # codebase went untested in the first place.
        if os.getenv("REQUIRE_INTEGRATION_DB") == "1":
            pytest.fail(message, pytrace=False)
        pytest.skip(message)
    finally:
        engine.dispose()
    return url


@pytest.fixture(scope="session")
def migrated_database(database_url):
    """Apply every migration from scratch.

    Running `downgrade base` first means the suite also proves the migrations
    are reversible, and that a rerun starts from a clean schema rather than
    whatever the last run left behind.
    """
    env = {
        **os.environ,
        "DB_HOST": "",  # unused; alembic reads the URL below
        "SQLALCHEMY_URL": database_url,
    }
    # app/config builds DATABASE_URL from DB_* parts, so feed it the pieces.
    from urllib.parse import urlparse

    parsed = urlparse(database_url)
    env.update(
        {
            "DB_HOST": parsed.hostname or "localhost",
            "DB_PORT": str(parsed.port or 5432),
            "DB_NAME": (parsed.path or "/devnotes_test").lstrip("/"),
            "DB_USER": parsed.username or "devnotes",
            "DB_PASSWORD": parsed.password or "devnotes",
            "DB_SSL_MODE": os.getenv("TEST_DB_SSL_MODE", "disable"),
            "SECRET_KEY": "integration-test-secret-key-value-0123456789",
            "ENVIRONMENT": "test",
        }
    )

    def alembic(*args: str) -> None:
        result = subprocess.run(
            ["python", "-m", "alembic", *args],
            cwd=BACKEND_DIR,
            env=env,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise AssertionError(
                f"alembic {' '.join(args)} failed:\n{result.stdout}\n{result.stderr}"
            )

    alembic("downgrade", "base")
    alembic("upgrade", "head")
    return database_url


@pytest.fixture
def db(migrated_database):
    """A session wrapped in a transaction that is rolled back after the test,
    so tests share one migrated schema without leaking rows into each other."""
    engine = create_engine(migrated_database)
    connection = engine.connect()
    outer = connection.begin()
    Session = sessionmaker(bind=connection, expire_on_commit=False)
    session = Session()

    try:
        yield session
    finally:
        session.close()
        # A test that provokes an IntegrityError has already aborted the
        # transaction; rolling back again would warn.
        if outer.is_active:
            outer.rollback()
        connection.close()
        engine.dispose()


@pytest.fixture
def make_user(db):
    from app.models.user import User

    created = {"count": 0}

    def _make(**overrides):
        created["count"] += 1
        index = created["count"]
        payload = {
            "name": f"User {index}",
            "email": f"user{index}@example.com",
            "username": f"user-{index}",
            "hashed_password": "not-a-real-hash",
        }
        payload.update(overrides)
        user = User(**payload)
        db.add(user)
        db.flush()
        return user

    return _make


@pytest.fixture
def make_note(db):
    from app.models.note import Note

    def _make(user, **overrides):
        payload = {
            "user_id": user.id,
            "title": "A note",
            "content": "Body text",
            "tags": [],
            "note_type": "note",
        }
        payload.update(overrides)
        note = Note(**payload)
        db.add(note)
        db.flush()
        return note

    return _make
