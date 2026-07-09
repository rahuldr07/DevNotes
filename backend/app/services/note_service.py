import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.repositories import note_repo
from app.models.note import Note


MAX_UUID_RETRIES = 3  # For the astronomically unlikely UUID collision
MAX_NOTE_VERSIONS = 20


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
    note_type: str = "note",
    language: str | None = None,
    source_url: str | None = None,
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
        note_type=note_type,
        language=language.strip().lower() if language else None,
        source_url=source_url.strip() if source_url else None,
    )
    return new_note

def update_note(
    db: Session,
    user_id: int,
    note_id: int,
    title: str | None,
    content: str | None,
    tags: list[str] | None = None,
    note_type: str | None = None,
    language: str | None = None,
    source_url: str | None = None,
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
            version_number = note_repo.get_latest_version_number(db, note_id) + 1
            note_repo.create_note_version(
                db,
                note_id=note_id,
                title=new_note.title,
                content=new_note.content,
                tags=list(new_note.tags or []),
                version_number=version_number,
            )
            note_repo.trim_note_versions(
                db,
                note_id=note_id,
                max_versions=MAX_NOTE_VERSIONS,
            )
            
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
                        note_type=note_type,
                        language=language.strip().lower() if language else language,
                        source_url=source_url.strip() if source_url else source_url,
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


def _get_owned_note(db: Session, user_id: int, note_id: int) -> Note:
    note = note_repo.get_by_note_id(db, note_id=note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.user_id != user_id:
        raise HTTPException(status_code=403, detail="Note does not belong to the user")
    return note


def get_note_versions(db: Session, user_id: int, note_id: int) -> list:
    _get_owned_note(db, user_id=user_id, note_id=note_id)
    return note_repo.get_note_versions(db, note_id=note_id)


def get_note_version(db: Session, user_id: int, note_id: int, version_id: int):
    _get_owned_note(db, user_id=user_id, note_id=note_id)
    version = note_repo.get_note_version_by_id(
        db,
        note_id=note_id,
        version_id=version_id,
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version

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
    
def _item_id(item) -> int:
    if isinstance(item, dict):
        return item["id"]
    return item.id


def _paginate(items: list, limit: int) -> dict:
    data = items[:limit]
    next_cursor = _item_id(data[-1]) if len(items) > limit and data else None
    return {"data": data, "next_cursor": next_cursor}


def get_my_notes(
    db: Session,
    user_id: int,
    cursor: int | None = None,
    limit: int = 20,
    note_type: str | None = None,
) -> dict:
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
    notes = note_repo.get_my_notes(
        db,
        user_id=user_id,
        cursor=cursor,
        limit=limit + 1,
        note_type=note_type,
    )
    return _paginate(notes, limit)


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
        # Allow access if owner OR if note is safely visible in the community feed.
        if note.user_id == user_id or (note.is_community and note.is_published):
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


def _normalize_filter(value: str | None) -> str | None:
    """Blank or whitespace-only filters mean 'no filter'."""
    if value is None:
        return None
    cleaned = value.strip().lower()
    return cleaned or None


def search_notes(
    db: Session,
    user_id: int,
    query: str,
    cursor: int | None = None,
    limit: int = 20,
    note_type: str | None = None,
    tag: str | None = None,
    language: str | None = None,
) -> dict:
    if not query.strip():
        return {"data": [], "next_cursor": None}
    notes = note_repo.search_notes(
        db,
        user_id=user_id,
        search_query=query,
        cursor=cursor,
        limit=limit + 1,
        note_type=note_type,
        tag=_normalize_filter(tag),
        language=_normalize_filter(language),
    )
    return _paginate(notes, limit)

def get_public_note(db: Session, share_uuid: str) -> Note:
    """
    Retrieves a note by its share UUID if it is published.
    """
    note = note_repo.get_by_share_uuid(db, share_uuid=share_uuid)
    if not note or not note.is_published:
        # Return 404 even if exists but not published (security)
        raise HTTPException(status_code=404, detail="Note not found")
    note_repo.increment_view_count(db, note.id)
    note.view_count = (note.view_count or 0) + 1
    return note_repo.get_public_note_response(db, note)


def get_related_public_notes(db: Session, share_uuid: str, limit: int = 3) -> list[dict]:
    note = note_repo.get_by_share_uuid(db, share_uuid=share_uuid)
    if not note or not note.is_published:
        raise HTTPException(status_code=404, detail="Note not found")
    return note_repo.get_related_public_notes(db, note=note, limit=limit)

def get_community_notes(
    db: Session,
    cursor: int | None = None,
    limit: int = 20,
) -> dict:
    """Retrieves all community notes."""
    notes = note_repo.get_community_notes(
        db,
        cursor=cursor,
        limit=limit + 1,
    )
    paginated = _paginate(notes, limit)
    note_ids = [_item_id(note) for note in paginated["data"]]
    note_repo.increment_view_counts(db, note_ids)
    for note in paginated["data"]:
        note["view_count"] = (note.get("view_count") or 0) + 1
    return paginated


def toggle_like(db: Session, user_id: int, note_id: int) -> dict:
    note = note_repo.get_by_note_id(db, note_id=note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if not note.is_published or not note.is_community:
        raise HTTPException(status_code=404, detail="Note not found")

    existing_like = note_repo.get_like(db, note_id=note_id, user_id=user_id)
    if existing_like:
        note_repo.delete_like(db, existing_like)
        liked = False
    else:
        note_repo.create_like(db, note_id=note_id, user_id=user_id)
        liked = True

    return {
        "liked": liked,
        "like_count": note_repo.get_like_count(db, note_id=note_id),
    }
