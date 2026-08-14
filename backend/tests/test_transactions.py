"""Services own the transaction boundary; repositories only stage and flush."""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError


def _note(**overrides):
    payload = {
        "id": 5,
        "user_id": 1,
        "title": "Old title",
        "content": "Old content",
        "tags": ["a"],
        "share_uuid": None,
        "is_published": False,
        "is_community": False,
        "view_count": 0,
        "note_type": "note",
    }
    payload.update(overrides)
    return SimpleNamespace(**payload)


def test_transaction_commits_once_on_success(fake_session):
    from app.database import transaction

    with transaction(fake_session):
        pass

    assert fake_session.commits == 1
    assert fake_session.rollbacks == 0


def test_transaction_rolls_back_and_reraises(fake_session):
    from app.database import transaction

    with pytest.raises(ValueError):
        with transaction(fake_session):
            raise ValueError("boom")

    assert fake_session.commits == 0
    assert fake_session.rollbacks == 1


def test_transaction_tolerates_a_null_session():
    """Service-layer unit tests inject None and monkeypatch the repositories."""
    from app.database import transaction

    with transaction(None) as db:
        assert db is None


def test_repositories_no_longer_commit():
    """A repository that commits on its own breaks every multi-write service."""
    from pathlib import Path

    repo_dir = Path(__file__).resolve().parents[1] / "app" / "repositories"
    offenders = [
        path.name
        for path in repo_dir.glob("*.py")
        if "db.commit()" in path.read_text()
    ]

    assert offenders == []


def test_note_update_snapshots_and_updates_in_one_transaction(monkeypatch, fake_session):
    from app.services import note_service

    calls = []
    monkeypatch.setattr(
        note_service.note_repo, "get_by_note_id", lambda db, note_id: _note()
    )
    monkeypatch.setattr(
        note_service.note_repo, "get_latest_version_number", lambda db, note_id: 3
    )
    monkeypatch.setattr(
        note_service.note_repo,
        "create_note_version",
        lambda db, **kwargs: calls.append(("version", kwargs["version_number"])),
    )
    monkeypatch.setattr(
        note_service.note_repo,
        "trim_note_versions",
        lambda db, **kwargs: calls.append(("trim", kwargs["max_versions"])),
    )
    monkeypatch.setattr(
        note_service.note_repo,
        "update",
        lambda db, **kwargs: calls.append(("update", kwargs["title"])) or _note(title="New"),
    )

    result = note_service.update_note(
        fake_session, user_id=1, note_id=5, title="New", content=None
    )

    assert result.title == "New"
    assert calls == [("version", 4), ("trim", 20), ("update", "New")]
    # One commit for the whole unit of work, not one per repository call.
    assert fake_session.commits == 1


def test_note_update_retry_recreates_the_version_snapshot(monkeypatch, fake_session):
    """A share_uuid collision rolls the snapshot back with the update, so the
    retry must write it again instead of silently losing a version."""
    from app.services import note_service

    versions = []
    attempts = {"count": 0}

    monkeypatch.setattr(
        note_service.note_repo, "get_by_note_id", lambda db, note_id: _note()
    )
    monkeypatch.setattr(
        note_service.note_repo, "get_latest_version_number", lambda db, note_id: 0
    )
    monkeypatch.setattr(
        note_service.note_repo,
        "create_note_version",
        lambda db, **kwargs: versions.append(kwargs["version_number"]),
    )
    monkeypatch.setattr(note_service.note_repo, "trim_note_versions", lambda db, **k: None)

    def flaky_update(db, **kwargs):
        attempts["count"] += 1
        if attempts["count"] == 1:
            raise IntegrityError("dup", {}, Exception("share_uuid"))
        return _note(share_uuid=kwargs["share_uuid"], is_published=True)

    monkeypatch.setattr(note_service.note_repo, "update", flaky_update)

    result = note_service.update_note(
        fake_session,
        user_id=1,
        note_id=5,
        title="New",
        content=None,
        is_published=True,
    )

    assert attempts["count"] == 2
    assert versions == [1, 1], "the snapshot must be recreated after rollback"
    assert result.share_uuid
    assert fake_session.rollbacks == 1
    assert fake_session.commits == 1


def test_note_update_gives_up_after_max_retries(monkeypatch, fake_session):
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo, "get_by_note_id", lambda db, note_id: _note()
    )
    monkeypatch.setattr(
        note_service.note_repo, "get_latest_version_number", lambda db, note_id: 0
    )
    monkeypatch.setattr(note_service.note_repo, "create_note_version", lambda db, **k: None)
    monkeypatch.setattr(note_service.note_repo, "trim_note_versions", lambda db, **k: None)

    def always_conflicts(db, **kwargs):
        raise IntegrityError("dup", {}, Exception("share_uuid"))

    monkeypatch.setattr(note_service.note_repo, "update", always_conflicts)

    with pytest.raises(HTTPException) as exc:
        note_service.update_note(
            fake_session,
            user_id=1,
            note_id=5,
            title="New",
            content=None,
            is_published=True,
        )

    assert exc.value.status_code == 500
    assert fake_session.rollbacks == note_service.MAX_UUID_RETRIES


def test_note_update_rejects_other_users_notes(monkeypatch, fake_session):
    from app.services import note_service

    monkeypatch.setattr(
        note_service.note_repo, "get_by_note_id", lambda db, note_id: _note(user_id=99)
    )

    with pytest.raises(HTTPException) as exc:
        note_service.update_note(fake_session, user_id=1, note_id=5, title="x", content=None)

    assert exc.value.status_code == 403
    assert fake_session.commits == 0
