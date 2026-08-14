"""Concurrent-write behaviour: version numbering, likes, and updated_at."""
from types import SimpleNamespace

from sqlalchemy.exc import IntegrityError


def _note(**overrides):
    payload = {
        "id": 5,
        "user_id": 1,
        "title": "Old",
        "content": "Old body",
        "tags": ["a"],
        "share_uuid": "uuid-1",
        "is_published": True,
        "is_community": True,
        "view_count": 0,
        "note_type": "note",
    }
    payload.update(overrides)
    return SimpleNamespace(**payload)


def test_version_number_collision_is_retried_against_a_fresh_max(
    monkeypatch, fake_session
):
    """Two concurrent edits both read max=3. The loser's INSERT trips the
    unique constraint and must retry, not lose the snapshot."""
    from app.services import note_service

    latest = {"value": 3}
    written = []
    attempts = {"count": 0}

    monkeypatch.setattr(
        note_service.note_repo, "get_by_note_id", lambda db, note_id: _note()
    )
    monkeypatch.setattr(
        note_service.note_repo,
        "get_latest_version_number",
        lambda db, note_id: latest["value"],
    )

    def create_version(db, **kwargs):
        attempts["count"] += 1
        if attempts["count"] == 1:
            # The other transaction won the race and took version 4.
            latest["value"] = 4
            raise IntegrityError("dup", {}, Exception("uq_note_versions"))
        written.append(kwargs["version_number"])

    monkeypatch.setattr(note_service.note_repo, "create_note_version", create_version)
    monkeypatch.setattr(note_service.note_repo, "trim_note_versions", lambda db, **k: None)
    monkeypatch.setattr(
        note_service.note_repo, "update", lambda db, **kwargs: _note(title="New")
    )

    result = note_service.update_note(
        fake_session, user_id=1, note_id=5, title="New", content=None
    )

    assert result.title == "New"
    assert written == [5], "the retry must renumber against the new max"


def test_double_like_reports_state_instead_of_a_503(monkeypatch, fake_session):
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo, "get_by_note_id", lambda db, note_id: _note()
    )
    monkeypatch.setattr(note_service.note_repo, "get_like", lambda db, note_id, user_id: None)

    def racing_create(db, note_id, user_id):
        raise IntegrityError("dup", {}, Exception("uq_note_likes_note_id_user_id"))

    monkeypatch.setattr(note_service.note_repo, "create_like", racing_create)
    monkeypatch.setattr(note_service.note_repo, "get_like_count", lambda db, note_id: 1)

    result = note_service.toggle_like(fake_session, user_id=1, note_id=5)

    assert result == {"liked": True, "like_count": 1}
    assert fake_session.rollbacks == 1


def test_like_toggle_commits_once(monkeypatch, fake_session):
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo, "get_by_note_id", lambda db, note_id: _note()
    )
    monkeypatch.setattr(note_service.note_repo, "get_like", lambda db, note_id, user_id: None)
    monkeypatch.setattr(note_service.note_repo, "create_like", lambda db, note_id, user_id: None)
    monkeypatch.setattr(note_service.note_repo, "get_like_count", lambda db, note_id: 1)

    note_service.toggle_like(fake_session, user_id=1, note_id=5)

    assert fake_session.commits == 1


def test_note_model_does_not_bump_updated_at_on_every_write():
    """A column-level onupdate would reorder "recently touched" whenever a
    publish or explore switch is flipped."""
    from app.models.note import Note

    assert Note.__table__.c.updated_at.onupdate is None


def test_note_versions_have_a_unique_constraint():
    from app.models.note_version import NoteVersion

    constraints = {
        tuple(sorted(column.name for column in constraint.columns))
        for constraint in NoteVersion.__table__.constraints
        if constraint.__class__.__name__ == "UniqueConstraint"
    }

    assert ("note_id", "version_number") in constraints
