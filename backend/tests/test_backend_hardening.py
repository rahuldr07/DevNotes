from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError


def _note(**overrides):
    payload = {
        "id": 12,
        "user_id": 2,
        "is_published": True,
        "is_community": True,
    }
    payload.update(overrides)
    return SimpleNamespace(**payload)


def test_like_endpoint_hides_private_notes(monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo,
        "get_by_note_id",
        lambda db, note_id: _note(is_published=False, is_community=False),
    )

    with pytest.raises(HTTPException) as exc:
        note_service.toggle_like(db=None, user_id=1, note_id=12)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Note not found"


def test_like_endpoint_hides_published_non_community_notes(monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo,
        "get_by_note_id",
        lambda db, note_id: _note(is_published=True, is_community=False),
    )

    with pytest.raises(HTTPException) as exc:
        note_service.toggle_like(db=None, user_id=1, note_id=12)

    assert exc.value.status_code == 404
    assert exc.value.detail == "Note not found"

def test_like_endpoint_allows_published_visible_notes(monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo,
        "get_by_note_id",
        lambda db, note_id: _note(is_published=True, is_community=True),
    )
    monkeypatch.setattr(note_service.note_repo, "get_like", lambda db, note_id, user_id: None)
    monkeypatch.setattr(note_service.note_repo, "create_like", lambda db, note_id, user_id: None)
    monkeypatch.setattr(note_service.note_repo, "get_like_count", lambda db, note_id: 1)

    assert note_service.toggle_like(db=None, user_id=1, note_id=12) == {
        "liked": True,
        "like_count": 1,
    }


def test_non_owner_cannot_get_unpublished_community_note(monkeypatch):
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo,
        "get_by_note_id",
        lambda db, note_id: _note(user_id=2, is_published=False, is_community=True),
    )

    with pytest.raises(HTTPException) as exc:
        note_service.get_note(db=None, user_id=1, note_id=12)

    assert exc.value.status_code == 403


def test_note_url_validation_and_language_normalization():
    from app.schemas.note import NoteCreate

    note = NoteCreate(
        title="Title",
        content="Body",
        language=" Python ",
        source_url=" https://example.com/post ",
    )

    assert note.language == "python"
    assert note.source_url == "https://example.com/post"

    with pytest.raises(ValidationError):
        NoteCreate(title="Title", content="Body", source_url="javascript:alert(1)")


def test_get_current_user_does_not_leak_token_parse_details(monkeypatch):
    from app import dependencies

    monkeypatch.setattr(
        dependencies,
        "verify_access_token",
        lambda token: (_ for _ in ()).throw(ValueError("raw jwt parse failure")),
    )

    with pytest.raises(HTTPException) as exc:
        dependencies.get_current_user(token="bad-token", db=None)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


def test_get_db_rolls_back_before_close(monkeypatch):
    from app import dependencies

    calls = []

    class FakeSession:
        def rollback(self):
            calls.append("rollback")

        def close(self):
            calls.append("close")

    monkeypatch.setattr(dependencies, "SessionLocal", lambda: FakeSession())

    db = dependencies.get_db()
    next(db)
    with pytest.raises(RuntimeError):
        db.throw(RuntimeError("boom"))

    assert calls == ["rollback", "close"]
