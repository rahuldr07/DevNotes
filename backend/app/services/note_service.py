from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories import note_repo
from app.models.note import Note



def create_note(db: Session, user_id: int, title: str, content: str)-> Note | None:
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
    new_note = note_repo.create(db,user_id=user_id, title=title, content=content)
    return new_note

def update_note(db:Session,user_id: int, note_id: int, title: str, content: str) -> Note | None:
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
            return note_repo.update(db, note_id=note_id, title=title, content=content)
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
        if note.user_id == user_id:
            return note
        else:
            raise HTTPException(status_code=403, detail="Note does not belong to the user")
    else:
        raise HTTPException(status_code=404, detail="Note not found")