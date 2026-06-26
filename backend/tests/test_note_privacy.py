from datetime import datetime, timezone


def _note_payload(**overrides):
    payload = {
        "id": 10,
        "user_id": 99,
        "title": "Compiler Notes",
        "content": "A public note.",
        "tags": ["python"],
        "is_pinned": False,
        "share_uuid": "share-uuid",
        "is_published": True,
        "is_community": True,
        "created_at": datetime(2026, 1, 2, tzinfo=timezone.utc),
        "updated_at": None,
    }
    payload.update(overrides)
    return payload


def test_community_notes_expose_author_name_not_user_id(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_community_notes",
        lambda db, cursor=None, limit=20: {
            "data": [_note_payload(author_name="Grace Hopper")],
            "next_cursor": None,
        },
    )

    response = notes_client.get("/notes/community", headers={"Authorization": "Bearer token"})

    assert response.status_code == 200
    note = response.json()["data"][0]
    assert note["author_name"] == "Grace Hopper"
    assert "user_id" not in note


def test_public_note_uses_share_uuid_as_only_identifier(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_public_note",
        lambda db, share_uuid: _note_payload(share_uuid=share_uuid),
    )

    response = notes_client.get("/notes/public/share-uuid")

    assert response.status_code == 200
    note = response.json()
    assert note["share_uuid"] == "share-uuid"
    assert "id" not in note
    assert "user_id" not in note


def test_related_public_notes_hide_internal_identifiers(notes_client, monkeypatch):
    from app.services import note_service

    calls = {}

    def fake_related(db, share_uuid: str, limit: int = 3):
        calls["share_uuid"] = share_uuid
        calls["limit"] = limit
        return [_note_payload(title="Related", share_uuid="related-uuid")]

    monkeypatch.setattr(note_service, "get_related_public_notes", fake_related)

    response = notes_client.get("/notes/public/share-uuid/related?limit=500")

    assert response.status_code == 200
    assert calls == {"share_uuid": "share-uuid", "limit": 100}
    note = response.json()[0]
    assert note["share_uuid"] == "related-uuid"
    assert note["title"] == "Related"
    assert "id" not in note
    assert "user_id" not in note
