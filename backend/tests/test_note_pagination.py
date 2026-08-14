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

    def fake_get_my_notes(
        db,
        user_id,
        cursor=None,
        limit=20,
        note_type=None,
        library_filter=None,
        tag=None,
        sort="updated",
    ):
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

    def fake_get_community_notes(
            db, cursor=None, limit=20, viewer_id=None, query=None, tag=None, sort='recent'
        ):
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


def test_library_filters_and_sorts_reach_the_repository(monkeypatch):
    """They used to run in the browser, over whatever page was loaded."""
    from app.services import note_service

    captured = {}

    def fake_repo(db, user_id, offset, limit, note_type, library_filter, tag, sort):
        captured.update(
            {
                "offset": offset,
                "library_filter": library_filter,
                "tag": tag,
                "sort": sort,
            }
        )
        return []

    monkeypatch.setattr(note_service.note_repo, "get_my_notes", fake_repo)

    note_service.get_my_notes(
        None,
        user_id=1,
        library_filter="Pinned",
        tag=" DevOps ",
        sort="TITLE",
    )

    assert captured == {
        "offset": 0,
        "library_filter": "pinned",
        "tag": "devops",
        "sort": "title",
    }


def test_unknown_library_filter_shows_everything(monkeypatch):
    """An unrecognised chip must not silently empty the library."""
    from app.services import note_service

    captured = {}

    def fake_repo(db, user_id, offset, limit, note_type, library_filter, tag, sort):
        captured.update({"library_filter": library_filter, "sort": sort})
        return []

    monkeypatch.setattr(note_service.note_repo, "get_my_notes", fake_repo)

    note_service.get_my_notes(None, user_id=1, library_filter="bogus", sort="bogus")

    assert captured == {"library_filter": None, "sort": "updated"}


def test_all_filter_is_treated_as_no_filter(monkeypatch):
    from app.services import note_service

    captured = {}

    def fake_repo(db, user_id, offset, limit, note_type, library_filter, tag, sort):
        captured["library_filter"] = library_filter
        return []

    monkeypatch.setattr(note_service.note_repo, "get_my_notes", fake_repo)
    note_service.get_my_notes(None, user_id=1, library_filter="all")

    assert captured["library_filter"] is None


def test_library_pagination_advances_by_offset(monkeypatch):
    from types import SimpleNamespace

    from app.services import note_service

    seen = []

    def fake_repo(db, user_id, offset, limit, note_type, library_filter, tag, sort):
        seen.append(offset)
        return [SimpleNamespace(id=index) for index in range(limit)]

    monkeypatch.setattr(note_service.note_repo, "get_my_notes", fake_repo)

    first = note_service.get_my_notes(None, user_id=1, limit=4)
    assert first["next_cursor"] == 4

    note_service.get_my_notes(None, user_id=1, limit=4, cursor=first["next_cursor"])
    assert seen == [0, 4]


def test_library_orderings_all_end_in_a_unique_tiebreak():
    """Offset pagination skips or repeats rows when the ordering is not total."""
    from app.repositories import note_repo

    for sort in note_repo.LIBRARY_SORTS:
        ordering = note_repo._library_order(sort)
        assert "notes.id" in str(ordering[-1]), sort
