from datetime import datetime, timezone


def _community_note(**overrides):
    payload = {
        "id": 12,
        "author_name": "Grace Hopper",
        "title": "Community note",
        "content": "Body",
        "tags": [],
        "is_pinned": False,
        "share_uuid": "share-uuid",
        "is_published": True,
        "is_community": True,
        "like_count": 3,
        "view_count": 9,
        "created_at": datetime(2026, 1, 4, tzinfo=timezone.utc),
        "updated_at": None,
    }
    payload.update(overrides)
    return payload


def test_community_response_includes_like_and_view_counts(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_community_notes",
        lambda db, cursor=None, limit=20: {
            "data": [_community_note()],
            "next_cursor": None,
        },
    )

    response = notes_client.get(
        "/notes/community",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    note = response.json()["data"][0]
    assert note["like_count"] == 3
    assert note["view_count"] == 9


def test_public_response_includes_like_and_view_counts(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_public_note",
        lambda db, share_uuid: _community_note(id=99, share_uuid=share_uuid),
    )

    response = notes_client.get("/notes/public/share-uuid")

    assert response.status_code == 200
    note = response.json()
    assert note["like_count"] == 3
    assert note["view_count"] == 9


def test_like_endpoint_toggles_like(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "toggle_like",
        lambda db, user_id, note_id: {"liked": True, "like_count": 4},
        raising=False,
    )

    response = notes_client.post(
        "/notes/12/like",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    assert response.json() == {"liked": True, "like_count": 4}
