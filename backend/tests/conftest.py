import os
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_NAME", "devnotes_test")
os.environ.setdefault("DB_USER", "devnotes")
os.environ.setdefault("DB_PASSWORD", "devnotes")
os.environ.setdefault("SECRET_KEY", "test-secret-key")


@pytest.fixture
def current_user():
    return SimpleNamespace(
        id=1,
        name="Ada Lovelace",
        email="ada@example.com",
        username="ada-lovelace",
        bio=None,
        website_url=None,
        github_url=None,
        twitter_url=None,
        avatar_url=None,
        role="user",
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        updated_at=None,
    )


@pytest.fixture
def auth_client(current_user):
    from app.dependencies import get_current_user, get_db
    from app.routers import auth

    app = FastAPI()
    app.include_router(auth.router)
    app.dependency_overrides[get_current_user] = lambda: current_user
    app.dependency_overrides[get_db] = lambda: None

    with TestClient(app) as client:
        yield client


@pytest.fixture
def notes_client(current_user):
    from app.dependencies import get_current_user, get_db
    from app.routers import notes

    app = FastAPI()
    app.include_router(notes.router)
    app.dependency_overrides[get_current_user] = lambda: current_user
    app.dependency_overrides[get_db] = lambda: None

    with TestClient(app) as client:
        yield client
