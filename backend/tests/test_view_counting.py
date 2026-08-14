"""Reads must not write; counting is an explicit, authenticated-shape action."""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException


def _note(**overrides):
    payload = {
        "id": 5,
        "user_id": 1,
        "title": "T",
        "content": "C",
        "tags": [],
        "note_type": "note",
        "language": None,
        "source_url": None,
        "share_uuid": "uuid-1",
        "is_published": True,
        "is_listed": True,
        "is_community": True,
        "view_count": 7,
        "created_at": None,
        "updated_at": None,
    }
    payload.update(overrides)
    return SimpleNamespace(**payload)


def test_reading_a_public_note_does_not_write(monkeypatch, fake_session):
    """The public page is server-rendered — a GET-side increment counted the
    Next server's fetch, prefetches and crawlers included."""
    from app.services import note_service

    writes = []
    monkeypatch.setattr(
        note_service.note_repo, "get_by_share_uuid", lambda db, share_uuid: _note()
    )
    monkeypatch.setattr(
        note_service.note_repo,
        "increment_view_count",
        lambda db, note_id: writes.append(note_id),
    )
    monkeypatch.setattr(
        note_service.note_repo,
        "get_public_note_response",
        lambda db, note: {"title": note.title, "view_count": note.view_count},
    )

    note_service.get_public_note(fake_session, share_uuid="uuid-1")

    assert writes == []
    assert fake_session.commits == 0


def test_recording_a_view_increments_once(monkeypatch, fake_session):
    from app.services import note_service

    writes = []
    monkeypatch.setattr(
        note_service.note_repo, "get_by_share_uuid", lambda db, share_uuid: _note()
    )
    monkeypatch.setattr(
        note_service.note_repo,
        "increment_view_count",
        lambda db, note_id: writes.append(note_id),
    )

    result = note_service.record_public_view(fake_session, share_uuid="uuid-1")

    assert writes == [5]
    assert result == {"view_count": 8}
    assert fake_session.commits == 1


def test_recording_a_view_on_an_unpublished_note_is_a_404(monkeypatch, fake_session):
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo,
        "get_by_share_uuid",
        lambda db, share_uuid: _note(is_published=False),
    )

    with pytest.raises(HTTPException) as exc:
        note_service.record_public_view(fake_session, share_uuid="uuid-1")

    assert exc.value.status_code == 404


def test_recording_a_view_on_a_missing_note_is_a_404(monkeypatch, fake_session):
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo, "get_by_share_uuid", lambda db, share_uuid: None
    )

    with pytest.raises(HTTPException) as exc:
        note_service.record_public_view(fake_session, share_uuid="nope")

    assert exc.value.status_code == 404


def test_browsing_explore_does_not_inflate_view_counts(monkeypatch, fake_session):
    """Appearing in a feed listing is not a read of the note."""
    from app.services import note_service

    writes = []
    monkeypatch.setattr(
        note_service.note_repo,
        "get_community_notes",
        lambda db, cursor, limit, viewer_id: [
            {"id": 1, "view_count": 3},
            {"id": 2, "view_count": 4},
        ],
    )
    monkeypatch.setattr(
        note_service.note_repo,
        "increment_view_counts",
        lambda db, note_ids: writes.append(note_ids),
    )

    page = note_service.get_community_notes(fake_session, cursor=None, limit=20, viewer_id=1)

    assert writes == []
    assert [note["view_count"] for note in page["data"]] == [3, 4]
