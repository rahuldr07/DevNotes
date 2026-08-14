"""Publishing mints a link; listing is the separate opt-in to be discoverable."""
from types import SimpleNamespace

import pytest


class FakeNote:
    def __init__(self, **overrides):
        self.id = 5
        self.user_id = 1
        self.title = "T"
        self.content = "C"
        self.tags = []
        self.note_type = "note"
        self.language = None
        self.source_url = None
        self.is_pinned = False
        self.share_uuid = "uuid-1"
        self.is_published = False
        self.is_listed = False
        self.is_community = False
        self.view_count = 0
        self.updated_at = None
        self.__dict__.update(overrides)


class FakeQuery:
    """Minimal stand-in so note_repo.update can be exercised without a DB."""

    def __init__(self, note):
        self._note = note

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self._note


class FakeDb:
    def __init__(self, note):
        self._note = note

    def query(self, *args, **kwargs):
        return FakeQuery(self._note)

    def flush(self):
        pass

    def refresh(self, obj):
        pass


def _update(note, **kwargs):
    from app.repositories import note_repo

    payload = {
        "title": None,
        "content": None,
        "tags": None,
        "note_type": None,
        "language": None,
        "source_url": None,
    }
    payload.update(kwargs)
    return note_repo.update(FakeDb(note), note_id=note.id, **payload)


def test_publishing_alone_does_not_list_the_note():
    """The share dialog promises a link and nothing more."""
    note = FakeNote()

    updated = _update(note, is_published=True)

    assert updated.is_published is True
    assert updated.is_listed is False
    assert updated.is_community is False


def test_listing_requires_publishing():
    note = FakeNote(is_published=False)

    updated = _update(note, is_listed=True)

    assert updated.is_listed is False


def test_unpublishing_withdraws_listing_and_explore():
    note = FakeNote(is_published=True, is_listed=True, is_community=True)

    updated = _update(note, is_published=False)

    assert updated.is_published is False
    assert updated.is_listed is False
    assert updated.is_community is False


def test_listing_can_be_switched_off_without_unpublishing():
    note = FakeNote(is_published=True, is_listed=True)

    updated = _update(note, is_listed=False)

    assert updated.is_published is True, "the share link must keep working"
    assert updated.is_listed is False


def test_visibility_toggles_do_not_bump_updated_at():
    note = FakeNote(is_published=True, updated_at="original")

    updated = _update(note, is_listed=True, is_community=True)

    assert updated.updated_at == "original"


def test_content_changes_do_bump_updated_at():
    note = FakeNote(updated_at="original")

    updated = _update(note, title="New title")

    assert updated.updated_at != "original"


def test_profile_listing_query_filters_on_is_listed():
    """An unlisted note must not appear on /u/<username>."""
    import inspect

    from app.repositories import note_repo

    source = inspect.getsource(note_repo.get_public_notes_for_user)
    assert "Note.is_listed == True" in source


def test_related_reading_query_filters_on_is_listed():
    """...nor as related reading on a stranger's public page."""
    import inspect

    from app.repositories import note_repo

    source = inspect.getsource(note_repo.get_related_public_notes)
    assert "Note.is_listed == True" in source


def test_update_schema_accepts_is_listed():
    from app.schemas.note import NoteUpdate

    assert NoteUpdate(is_listed=True).is_listed is True
    assert NoteUpdate().is_listed is None


def test_note_response_exposes_is_listed():
    from app.schemas.note import NoteResponse

    payload = NoteResponse.model_validate(
        SimpleNamespace(
            id=1,
            user_id=1,
            title="t",
            content="c",
            tags=[],
            note_type="note",
            language=None,
            source_url=None,
            is_pinned=False,
            share_uuid=None,
            is_published=True,
            is_listed=True,
            is_community=False,
            created_at=__import__("datetime").datetime(2026, 1, 1),
            updated_at=None,
        )
    )

    assert payload.is_listed is True
