from datetime import datetime, timezone
from types import SimpleNamespace


def _note(note_id: int):
    return SimpleNamespace(
        id=note_id,
        user_id=1,
        title=f"Note {note_id}",
        content="Body",
        tags=[],
        is_pinned=False,
        share_uuid=None,
        is_published=False,
        is_community=False,
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        updated_at=None,
    )


def _community_note(note_id: int):
    return {
        "id": note_id,
        "author_name": "Grace Hopper",
        "title": f"Note {note_id}",
        "content": "Body",
        "tags": [],
        "is_pinned": False,
        "share_uuid": None,
        "is_published": False,
        "is_community": True,
        "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
        "updated_at": None,
    }


def test_my_notes_returns_paginated_envelope(notes_client, monkeypatch):
    from app.services import note_service

    calls = {}

    def fake_get_my_notes(db, user_id, cursor=None, limit=20, note_type=None):
        calls.update({"user_id": user_id, "cursor": cursor, "limit": limit, "note_type": note_type})
        return {"data": [_note(9), _note(8)], "next_cursor": 8}

    monkeypatch.setattr(note_service, "get_my_notes", fake_get_my_notes)

    response = notes_client.get(
        "/notes/notes?cursor=10&limit=500",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    assert calls == {"user_id": 1, "cursor": 10, "limit": 100, "note_type": None}
    assert response.json()["next_cursor"] == 8
    assert [note["id"] for note in response.json()["data"]] == [9, 8]


def test_community_notes_returns_paginated_envelope(notes_client, monkeypatch):
    from app.services import note_service

    calls = {}

    def fake_get_community_notes(db, cursor=None, limit=20):
        calls.update({"cursor": cursor, "limit": limit})
        return {"data": [_community_note(7)], "next_cursor": None}

    monkeypatch.setattr(note_service, "get_community_notes", fake_get_community_notes)

    response = notes_client.get(
        "/notes/community?cursor=8&limit=0",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    assert calls == {"cursor": 8, "limit": 1}
    assert response.json()["next_cursor"] is None
    assert response.json()["data"][0]["author_name"] == "Grace Hopper"
