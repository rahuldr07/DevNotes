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

    def fake_search_notes(
        db,
        user_id,
        query,
        cursor=None,
        limit=20,
        note_type=None,
        tag=None,
        language=None,
    ):
        calls.update(
            {
                "user_id": user_id,
                "query": query,
                "cursor": cursor,
                "limit": limit,
                "note_type": note_type,
                "tag": tag,
                "language": language,
            }
        )
        return {"data": [_note(12)], "next_cursor": None}

    monkeypatch.setattr(note_service, "search_notes", fake_search_notes)

    response = notes_client.get(
        "/notes/search?q=postgres&cursor=13&limit=500",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    assert calls == {
        "user_id": 1,
        "query": "postgres",
        "cursor": 13,
        "limit": 100,
        "note_type": None,
        "tag": None,
        "language": None,
    }
    assert response.json()["data"][0]["id"] == 12
    assert response.json()["next_cursor"] is None


def test_search_notes_passes_type_tag_and_language_filters(notes_client, monkeypatch):
    from app.services import note_service

    calls = {}

    def fake_search_notes(
        db,
        user_id,
        query,
        cursor=None,
        limit=20,
        note_type=None,
        tag=None,
        language=None,
    ):
        calls.update({"note_type": note_type, "tag": tag, "language": language})
        return {"data": [], "next_cursor": None}

    monkeypatch.setattr(note_service, "search_notes", fake_search_notes)

    response = notes_client.get(
        "/notes/search?q=docker&note_type=snippet&tag=DevOps&language=Bash",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    assert calls == {"note_type": "snippet", "tag": "DevOps", "language": "Bash"}


def test_search_service_normalizes_tag_and_language_filters(monkeypatch):
    from app.services import note_service

    calls = {}

    def fake_repo_search(
        db,
        user_id,
        search_query,
        cursor=None,
        limit=20,
        note_type=None,
        tag=None,
        language=None,
    ):
        calls.update({"tag": tag, "language": language})
        return []

    monkeypatch.setattr(note_service.note_repo, "search_notes", fake_repo_search)

    result = note_service.search_notes(
        None,
        user_id=1,
        query="docker",
        tag="  DevOps ",
        language=" Bash ",
    )

    assert result == {"data": [], "next_cursor": None}
    assert calls == {"tag": "devops", "language": "bash"}


def test_search_service_treats_blank_filters_as_missing(monkeypatch):
    from app.services import note_service

    calls = {}

    def fake_repo_search(
        db,
        user_id,
        search_query,
        cursor=None,
        limit=20,
        note_type=None,
        tag=None,
        language=None,
    ):
        calls.update({"tag": tag, "language": language})
        return []

    monkeypatch.setattr(note_service.note_repo, "search_notes", fake_repo_search)

    note_service.search_notes(
        None,
        user_id=1,
        query="docker",
        tag="   ",
        language="",
    )

    assert calls == {"tag": None, "language": None}
