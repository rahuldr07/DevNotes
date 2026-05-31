from datetime import datetime, timezone
from types import SimpleNamespace


def _note(note_id: int):
    return SimpleNamespace(
        id=note_id,
        user_id=1,
        title=f"Search Result {note_id}",
        content="PostgreSQL search body",
        tags=[],
        is_pinned=False,
        share_uuid=None,
        is_published=False,
        is_community=False,
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        updated_at=None,
    )


def test_search_notes_uses_current_user_and_cursor_pagination(notes_client, monkeypatch):
    from app.services import note_service

    calls = {}

    def fake_search_notes(db, user_id, query, cursor=None, limit=20):
        calls.update(
            {"user_id": user_id, "query": query, "cursor": cursor, "limit": limit}
        )
        return {"data": [_note(12)], "next_cursor": None}

    monkeypatch.setattr(note_service, "search_notes", fake_search_notes)

    response = notes_client.get(
        "/notes/search?q=postgres&cursor=13&limit=500",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    assert calls == {"user_id": 1, "query": "postgres", "cursor": 13, "limit": 100}
    assert response.json()["data"][0]["id"] == 12
    assert response.json()["next_cursor"] is None
