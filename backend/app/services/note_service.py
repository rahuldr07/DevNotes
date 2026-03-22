import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.repositories import note_repo
from app.models.note import Note


MAX_UUID_RETRIES = 3  # For the astronomically unlikely UUID collision


def normalize_tags(tags: list[str] | None) -> list[str]:
    """Trim, lowercase, deduplicate tags while preserving first occurrence order."""
    if not tags:
        return []
    result: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = "-".join(tag.strip().lower().split())
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        result.append(cleaned)
    return result



def create_note(
    db: Session,
    user_id: int,
    title: str,
    content: str,
    tags: list[str] | None = None,
) -> Note | None:
    """
    Creates a new note for the specified user.

    Business rules:
    1. The note must be associated with the user who created it (user_id).
    2. The title and content are required fields.
    3. The created_at timestamp is automatically set by the database.

    Args:
        db: Active SQLAlchemy database session.
        user_id: The ID of the user creating the note.
        title: The title of the note.
        content: The content of the note.

    Returns:
        The newly created Note model instance.
    """
    normalized_tags = normalize_tags(tags)
    new_note = note_repo.create(
        db,
        user_id=user_id,
        title=title,
        content=content,
        tags=normalized_tags,
    )
    return new_note

def update_note(
    db: Session,
    user_id: int,
    note_id: int,
    title: str | None,
    content: str | None,
    tags: list[str] | None = None,
    is_published: bool | None = None,
    is_community: bool | None = None,
) -> Note | None:
    """
    Updates an existing note for the specified user.

    Business rules:
    1. The note must be associated with the user who created it (user_id).
    2. The title and content are required fields.
    3. The updated_at timestamp is automatically set by the database.

    Args:
        db: Active SQLAlchemy database session.
        note_id: The ID of the note to update.
        title: The new title of the note.
        content: The new content of the note.

    Returns:
        The updated Note model instance, or None if the note does not exist or does not belong to the user.
    """
    new_note = note_repo.get_by_note_id(db, note_id=note_id) 
    if new_note:
        if new_note.user_id == user_id:
            normalized_tags = normalize_tags(tags) if tags is not None else None
            
            # Generate share_uuid if publishing for the first time
            share_uuid = None
            if is_published is True and not new_note.share_uuid:
                share_uuid = str(uuid.uuid4())

            # Retry loop for the extremely rare UUID collision
            for attempt in range(MAX_UUID_RETRIES):
                try:
                    return note_repo.update(
                        db,
                        note_id=note_id,
                        title=title,
                        content=content,
                        tags=normalized_tags,
                        is_published=is_published,
                        is_community=is_community,
                        share_uuid=share_uuid,
                    )
                except IntegrityError:
                    db.rollback()
                    if share_uuid and attempt < MAX_UUID_RETRIES - 1:
                        # Regenerate UUID and retry
                        share_uuid = str(uuid.uuid4())
                    else:
                        raise HTTPException(
                            status_code=500,
                            detail="Failed to generate unique share link. Please try again."
                        )
        else:
            raise HTTPException(status_code=403, detail="Note does not belong to the user")
    else:
        raise HTTPException(status_code=404, detail="Note not found")

def delete_note(db: Session, user_id: int, note_id: int) -> None:
    """
    Deletes an existing note for the specified user.

    Business rules:
    1. The note must be associated with the user who created it (user_id).
    2. The note is permanently removed from the database.

    Args:
        db: Active SQLAlchemy database session.
        note_id: The ID of the note to delete.
    Returns:     None if the note was successfully deleted, or None if the note does not exist or does not belong to the user.
        None
    """
    note = note_repo.get_by_note_id(db, note_id=note_id)
    if note:
        if note.user_id == user_id:
            note_repo.delete(db, note_id=note_id)
        else:
            raise HTTPException(status_code=403, detail="Note does not belong to the user")
    else:
        raise HTTPException(status_code=404, detail="Note not found")
    
def get_my_notes(db: Session, user_id: int) -> list[Note]:
    """
    Retrieves all notes for the specified user.

    Business rules:
    1. Only notes associated with the user (user_id) are returned.
    2. The notes are returned in descending order of creation time.

    Args:
        db: Active SQLAlchemy database session.
        user_id: The ID of the user whose notes to retrieve.

    Returns:
        A list of Note model instances belonging to the user.
    """
    notes = note_repo.get_my_notes(db, user_id=user_id)
    return notes


def get_note(db: Session, user_id: int, note_id: int) -> Note | None:
    """
    Retrieves a specific note for the specified user.

    Business rules:
    1. The note must be associated with the user who created it (user_id).
    2. If the note does not exist or does not belong to the user, an HTTPException is raised.

    Args:
        db: Active SQLAlchemy database session.
        note_id: The ID of the note to retrieve.

    Returns:
        The Note model instance if found and belongs to the user, otherwise raises HTTPException.
    """
    note = note_repo.get_by_note_id(db, note_id=note_id)
    if note:
        # Allow access if owner OR if note is in community
        if note.user_id == user_id or note.is_community:
            return note
        else:
            raise HTTPException(status_code=403, detail="Note does not belong to the user")
    else:
        raise HTTPException(status_code=404, detail="Note not found")


def toggle_pin(db: Session, user_id: int, note_id: int) -> Note:
    """
    Toggles the is_pinned flag on a note.

    Business rules:
    1. The note must belong to the authenticated user.
    2. Flips is_pinned: True → False, False → True.
    """
    note = note_repo.get_by_note_id(db, note_id=note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != user_id:
        raise HTTPException(status_code=403, detail="Note does not belong to the user")
    return note_repo.toggle_pin(db, note_id=note_id)

def get_public_note(db: Session, share_uuid: str) -> Note:
    """
    Retrieves a note by its share UUID if it is published.
    """
    note = note_repo.get_by_share_uuid(db, share_uuid=share_uuid)
    if not note or not note.is_published:
        # Return 404 even if exists but not published (security)
        raise HTTPException(status_code=404, detail="Note not found")
    return note

def get_community_notes(db: Session) -> list[Note]:
    """Retrieves all community notes."""
    return note_repo.get_community_notes(db)
