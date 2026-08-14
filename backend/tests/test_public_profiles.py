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
                    "preview": "Public profile body",
                    "reading_minutes": 1,
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
    # The card ships a preview, not the whole body — the note's own page has that.
    assert response.json()["public_notes"][0]["preview"] == "Public profile body"
    assert "content" not in response.json()["public_notes"][0]


def test_profile_cards_do_not_ship_full_note_bodies(monkeypatch):
    """A profile with fifty long notes should not download fifty bodies to
    render two-line previews."""
    from app.repositories import note_repo

    long_body = "word " * 5000

    class FakeQuery:
        def outerjoin(self, *a, **k):
            return self

        def filter(self, *a, **k):
            return self

        def group_by(self, *a, **k):
            return self

        def order_by(self, *a, **k):
            return self

        def all(self):
            from types import SimpleNamespace

            note = SimpleNamespace(
                id=1,
                title="Long note",
                content=long_body,
                share_uuid="uuid",
                tags=[],
                note_type="note",
                language=None,
                source_url=None,
                view_count=0,
                created_at=None,
                updated_at=None,
            )
            return [(note, 3)]

    class FakeDb:
        def query(self, *a, **k):
            return FakeQuery()

    rows = note_repo.get_public_notes_for_user(FakeDb(), user_id=1)

    assert "content" not in rows[0]
    assert len(rows[0]["preview"]) < 400
    assert rows[0]["reading_minutes"] > 1
    assert rows[0]["like_count"] == 3


def test_like_counts_are_batched_into_one_query():
    """One COUNT per related card turned a public page into N+1 queries."""
    from app.repositories import note_repo

    queries = {"count": 0}

    class FakeQuery:
        def filter(self, *a, **k):
            return self

        def group_by(self, *a, **k):
            return self

        def all(self):
            return [(1, 4), (3, 2)]

    class FakeDb:
        def query(self, *a, **k):
            queries["count"] += 1
            return FakeQuery()

    counts = note_repo.get_like_counts(FakeDb(), [1, 2, 3])

    assert queries["count"] == 1
    assert counts == {1: 4, 2: 0, 3: 2}


def test_batched_like_counts_short_circuit_on_empty_input():
    from app.repositories import note_repo

    class ExplodingDb:
        def query(self, *a, **k):
            raise AssertionError("should not query for an empty id list")

    assert note_repo.get_like_counts(ExplodingDb(), []) == {}
