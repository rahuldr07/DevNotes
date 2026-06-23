from types import SimpleNamespace

import pytest
from fastapi import HTTPException


def test_toggle_pin_requires_note_ownership(monkeypatch):
    from app.repositories import note_repo
    from app.services import note_service

    monkeypatch.setattr(
        note_repo,
        "get_by_note_id",
        lambda db, note_id: SimpleNamespace(id=note_id, user_id=999, is_pinned=False),
    )

    with pytest.raises(HTTPException) as exc:
        note_service.toggle_pin(db=None, user_id=1, note_id=42)

    assert exc.value.status_code == 403


def test_toggle_pin_flips_owned_note(monkeypatch):
    from app.repositories import note_repo
    from app.services import note_service

    note = SimpleNamespace(id=42, user_id=1, is_pinned=False)
    calls = {}

    monkeypatch.setattr(note_repo, "get_by_note_id", lambda db, note_id: note)

    def fake_toggle_pin(db, note_id):
        calls["note_id"] = note_id
        note.is_pinned = not note.is_pinned
        return note

    monkeypatch.setattr(note_repo, "toggle_pin", fake_toggle_pin)

    result = note_service.toggle_pin(db=None, user_id=1, note_id=42)

    assert calls == {"note_id": 42}
    assert result.is_pinned is True
