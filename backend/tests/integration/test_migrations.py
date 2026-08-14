"""The migrations themselves — never executed by a test before this."""
from sqlalchemy import inspect, text


def test_every_migration_applies_and_reverses(migrated_database):
    """The fixture runs `downgrade base` then `upgrade head`; reaching this
    test at all means both directions completed."""
    assert migrated_database


def test_schema_matches_the_models(db):
    inspector = inspect(db.get_bind())
    tables = set(inspector.get_table_names())

    assert {"users", "notes", "note_likes", "note_versions", "user_sessions"} <= tables


def test_notes_carry_every_column_the_orm_expects(db):
    from app.models.note import Note

    inspector = inspect(db.get_bind())
    columns = {column["name"] for column in inspector.get_columns("notes")}
    expected = {column.name for column in Note.__table__.columns}

    assert expected <= columns, expected - columns


def test_search_vector_is_a_stored_generated_column(db):
    row = db.execute(
        text(
            """
            SELECT is_generated, generation_expression
            FROM information_schema.columns
            WHERE table_name = 'notes' AND column_name = 'search_vector'
            """
        )
    ).one()

    assert row.is_generated == "ALWAYS"
    # Tags are folded in through the immutable wrapper function; a stored
    # generated column cannot call array_to_string directly.
    assert "devnotes_note_search_vector" in row.generation_expression


def test_expected_indexes_exist(db):
    names = {
        row[0]
        for row in db.execute(
            text("SELECT indexname FROM pg_indexes WHERE tablename = 'notes'")
        )
    }

    assert "ix_notes_search_vector" in names
    assert "ix_notes_tags" in names, "tag containment queries need a GIN index"
    assert "ix_notes_community_feed" in names
    assert "ix_notes_public_listed" in names


def test_tag_index_is_gin(db):
    definition = db.execute(
        text("SELECT indexdef FROM pg_indexes WHERE indexname = 'ix_notes_tags'")
    ).scalar_one()

    assert "USING gin" in definition


def test_note_version_numbers_are_unique_per_note(db, make_user, make_note):
    """The constraint that turns a concurrent-edit race into a retryable error."""
    import pytest
    from sqlalchemy.exc import IntegrityError

    from app.models.note_version import NoteVersion

    user = make_user()
    note = make_note(user)

    db.add(NoteVersion(note_id=note.id, title="t", content="c", tags=[], version_number=1))
    db.flush()

    db.add(NoteVersion(note_id=note.id, title="t", content="c", tags=[], version_number=1))
    with pytest.raises(IntegrityError):
        db.flush()


def test_a_user_can_only_like_a_note_once(db, make_user, make_note):
    import pytest
    from sqlalchemy.exc import IntegrityError

    from app.models.note_like import NoteLike

    author = make_user()
    reader = make_user()
    note = make_note(author, is_published=True, is_community=True)

    db.add(NoteLike(note_id=note.id, user_id=reader.id))
    db.flush()

    db.add(NoteLike(note_id=note.id, user_id=reader.id))
    with pytest.raises(IntegrityError):
        db.flush()


def test_is_listed_defaults_to_false_for_new_notes(db, make_user, make_note):
    """Publishing mints a link; discovery is the separate opt-in."""
    user = make_user()
    note = make_note(user, is_published=True)
    db.refresh(note)

    assert note.is_listed is False


def test_deleting_a_user_cascades_to_their_notes(db, make_user, make_note):
    from app.models.note import Note

    user = make_user()
    make_note(user)
    db.flush()

    db.delete(user)
    db.flush()

    assert db.query(Note).filter(Note.user_id == user.id).count() == 0
