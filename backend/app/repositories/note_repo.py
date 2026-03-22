"""
Note Repository — Database queries for the notes table.

This is the ONLY layer that talks directly to the database for note operations.
All functions receive a SQLAlchemy Session and return Note model instances.

Pattern:  Router → Service (business logic) → Repository (THIS FILE) → Database

The repository does NOT check ownership or authorization.
That's the service layer's job (note_service.py).
"""
from sqlalchemy.orm import Session

from app.models.note import Note


def create(
    db: Session,
    user_id: int,
    title: str,
    content: str,
    tags: list[str] | None = None,
) -> Note | None:
    """
    Creates a new note in the database.

    Steps:
    1. db.add()     → Stages the Note object for insertion
    2. db.commit()  → Writes to the database
    3. db.refresh() → Reloads to get DB-generated fields (id, created_at)
    """
    oNote = Note(user_id=user_id, title=title, content=content, tags=tags or [])
    db.add(oNote)
    db.commit()
    db.refresh(oNote)
    return oNote

def get_by_note_id(db: Session, note_id: int) -> Note | None:
    """
    Finds a note by its primary key ID.
    Returns None if no note exists with that ID.

    Used by: update_note, delete_note, get_note in the service layer
    to first fetch the note before performing operations.
    """
    note = db.query(Note).filter(Note.id == note_id).first()
    return note

def update(
    db: Session,
    note_id: int,
    title: str | None,
    content: str | None,
    tags: list[str] | None = None,
    is_published: bool | None = None,
    is_community: bool | None = None,
    share_uuid: str | None = None,
) -> Note | None:
    """
    Updates an existing note's title and/or content.

    Only updates fields that are not None/empty (partial update support).
    db.commit() triggers SQLAlchemy's onupdate=func.now() on updated_at column.
    db.refresh() reloads the note to get the new updated_at timestamp.
    """
    oNote = db.query(Note).filter(Note.id == note_id).first()
    if oNote:
        if title is not None:
            oNote.title = title
        if content is not None:
            oNote.content = content
        if tags is not None:
            oNote.tags = tags
        if is_published is not None:
            oNote.is_published = is_published
        if is_community is not None:
            oNote.is_community = is_community
        if share_uuid is not None:
            oNote.share_uuid = share_uuid
        db.commit()
        db.refresh(oNote)
        return oNote
    return None

def delete(db: Session, note_id: int) -> None:
    """
    Permanently deletes a note from the database.

    db.delete() marks it for deletion, db.commit() executes the DELETE query.
    Returns None regardless (the service layer handles error responses).
    """
    oNote = db.query(Note).filter(Note.id == note_id).first()
    if oNote:
        db.delete(oNote)
        db.commit()
    return None

def get_my_notes(db:Session, user_id: int) -> list[Note]:
    """
    Fetches all notes belonging to a specific user.

    Uses .filter(Note.user_id == user_id) to ensure users
    only see their own notes (data isolation).
    """
    notes = db.query(Note).filter(Note.user_id == user_id).all()
    return notes

def toggle_pin(db: Session, note_id: int) -> Note:
    """Flips is_pinned on a note and returns the updated note."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if note:
        note.is_pinned = not note.is_pinned
        db.commit()
        db.refresh(note)
    return note

def get_by_share_uuid(db: Session, share_uuid: str) -> Note | None:
    """Finds a note by its share_uuid."""
    return db.query(Note).filter(Note.share_uuid == share_uuid).first()

def get_community_notes(db: Session) -> list[Note]:
    """Fetches all community notes (is_community=True)."""
    return db.query(Note).filter(Note.is_community == True).order_by(Note.created_at.desc()).all()
