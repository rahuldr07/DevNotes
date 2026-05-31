from datetime import datetime, timezone
from types import SimpleNamespace


def _note(**overrides):
    note = SimpleNamespace(
        id=10,
        user_id=1,
        title="Original title",
        content="Original content",
        tags=["history"],
        is_published=False,
        is_community=False,
        share_uuid=None,
    )
    for key, value in overrides.items():
        setattr(note, key, value)
    return note


def test_update_note_snapshots_existing_content_before_change(monkeypatch):
    from app.repositories import note_repo
    from app.services import note_service

    created = {}

    monkeypatch.setattr(note_repo, "get_by_note_id", lambda db, note_id: _note())
    monkeypatch.setattr(note_repo, "get_latest_version_number", lambda db, note_id: 2, raising=False)
    monkeypatch.setattr(
        note_repo,
        "create_note_version",
        lambda db, note_id, title, content, tags, version_number: created.update(
            {
                "note_id": note_id,
                "title": title,
                "content": content,
                "tags": tags,
                "version_number": version_number,
            }
        ),
        raising=False,
    )
    monkeypatch.setattr(note_repo, "trim_note_versions", lambda db, note_id, max_versions=20: None, raising=False)
    monkeypatch.setattr(
        note_repo,
        "update",
        lambda db, **kwargs: _note(title=kwargs["title"], content=kwargs["content"]),
    )

    note_service.update_note(
        None,
        user_id=1,
        note_id=10,
        title="Updated title",
        content="Updated content",
        tags=["updated"],
    )

    assert created == {
        "note_id": 10,
        "title": "Original title",
        "content": "Original content",
        "tags": ["history"],
        "version_number": 3,
    }


def test_get_note_versions_returns_summary_list(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_note_versions",
        lambda db, user_id, note_id: [
            {
                "id": 4,
                "version_number": 1,
                "title": "Original title",
                "created_at": datetime(2026, 1, 3, tzinfo=timezone.utc),
            }
        ],
        raising=False,
    )

    response = notes_client.get(
        "/notes/10/versions",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    assert response.json()[0]["version_number"] == 1
    assert "content" not in response.json()[0]


def test_get_note_version_detail_returns_content(notes_client, monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service,
        "get_note_version",
        lambda db, user_id, note_id, version_id: {
            "id": version_id,
            "note_id": note_id,
            "version_number": 1,
            "title": "Original title",
            "content": "Original content",
            "tags": ["history"],
            "created_at": datetime(2026, 1, 3, tzinfo=timezone.utc),
        },
        raising=False,
    )

    response = notes_client.get(
        "/notes/10/versions/4",
        headers={"Authorization": "Bearer token"},
    )

    assert response.status_code == 200
    assert response.json()["content"] == "Original content"
