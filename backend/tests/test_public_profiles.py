from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_generate_unique_username_normalizes_and_resolves_collision(monkeypatch):
    from app.repositories import user_repo
    from app.services import auth_service

    seen = {"ada-lovelace"}

    def fake_get_by_username(db, username):
        return object() if username in seen else None

    monkeypatch.setattr(user_repo, "get_by_username", fake_get_by_username, raising=False)

    assert auth_service.generate_unique_username(None, "Ada Lovelace!") == "ada-lovelace-1"


def test_public_profile_endpoint_returns_published_notes(monkeypatch):
    from app.routers import profiles
    from app.services import profile_service

    monkeypatch.setattr(
        profile_service,
        "get_public_profile",
        lambda db, username: {
            "username": username,
            "name": "Ada Lovelace",
            "bio": "Mathematical notes and computing guides.",
            "website_url": "https://ada.example",
            "github_url": None,
            "twitter_url": None,
            "avatar_url": None,
            "created_at": datetime(2026, 1, 5, tzinfo=timezone.utc),
            "public_notes": [
                {
                    "id": 7,
                    "title": "Published note",
                    "content": "Public profile body",
                    "share_uuid": "share-uuid",
                    "tags": ["math"],
                    "note_type": "guide",
                    "language": None,
                    "source_url": None,
                    "like_count": 2,
                    "view_count": 5,
                    "created_at": datetime(2026, 1, 6, tzinfo=timezone.utc),
                    "updated_at": None,
                }
            ],
        },
    )

    app = FastAPI()
    app.include_router(profiles.router)
    client = TestClient(app)

    response = client.get("/u/ada-lovelace")

    assert response.status_code == 200
    assert response.json()["username"] == "ada-lovelace"
    assert response.json()["bio"] == "Mathematical notes and computing guides."
    assert response.json()["public_notes"][0]["share_uuid"] == "share-uuid"
    assert response.json()["public_notes"][0]["note_type"] == "guide"
    assert response.json()["public_notes"][0]["content"] == "Public profile body"
