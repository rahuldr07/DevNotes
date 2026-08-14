import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import transaction
from app.repositories import note_repo
from app.models.note import Note


MAX_UUID_RETRIES = 3  # For the astronomically unlikely UUID collision
MAX_NOTE_VERSIONS = 20
MAX_ACTIVITY_WEEKS = 53


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
    with transaction(db):
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
    is_listed: bool | None = None,
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
    existing = _get_owned_note(db, user_id=user_id, note_id=note_id)
    normalized_tags = normalize_tags(tags) if tags is not None else None

    # Snapshot only when the content actually changes — publish and explore
    # toggles would otherwise burn version slots on identical copies.
    content_changed = (
        (title is not None and title != existing.title)
        or (content is not None and content != existing.content)
        or (
            normalized_tags is not None
            and normalized_tags != list(existing.tags or [])
        )
    )
    previous_title = existing.title
    previous_content = existing.content
    previous_tags = list(existing.tags or [])
    needs_share_uuid = is_published is True and not existing.share_uuid

    # The snapshot, the trim and the update are one unit of work, so a failed
    # update cannot leave an orphaned version behind. A share_uuid collision
    # rolls the whole unit back — including the snapshot — so the retry below
    # re-creates it rather than silently losing a version.
    for attempt in range(MAX_UUID_RETRIES):
        share_uuid = str(uuid.uuid4()) if needs_share_uuid else None
        try:
            with transaction(db):
                if content_changed:
                    version_number = note_repo.get_latest_version_number(db, note_id) + 1
                    note_repo.create_note_version(
                        db,
                        note_id=note_id,
                        title=previous_title,
                        content=previous_content,
                        tags=previous_tags,
                        version_number=version_number,
                    )
                    note_repo.trim_note_versions(
                        db,
                        note_id=note_id,
                        max_versions=MAX_NOTE_VERSIONS,
                    )

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
                    is_listed=is_listed,
                    is_community=is_community,
                    share_uuid=share_uuid,
                )
        except IntegrityError:
            # transaction() already rolled back.
            if attempt == MAX_UUID_RETRIES - 1:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to save the note. Please try again.",
                ) from None


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
    _get_owned_note(db, user_id=user_id, note_id=note_id)
    with transaction(db):
        note_repo.delete(db, note_id=note_id)
    
def _item_id(item) -> int:
    if isinstance(item, dict):
        return item["id"]
    return item.id


def _paginate_by_offset(items: list, limit: int, offset: int) -> dict:
    """Offset pagination for rank-ordered results (see search_notes)."""
    data = items[:limit]
    has_more = len(items) > limit
    return {
        "data": data,
        "next_cursor": offset + len(data) if has_more else None,
    }


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
    _get_owned_note(db, user_id=user_id, note_id=note_id)
    with transaction(db):
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
    """Relevance-ordered search.

    `cursor` is an offset here, not a note id: results are ranked, and rank
    does not track id, so an id-keyed cursor silently dropped and repeated
    rows between pages. The next cursor is simply how many rows have been
    returned so far.
    """
    if not query.strip():
        return {"data": [], "next_cursor": None}
    offset = max(0, cursor or 0)
    notes = note_repo.search_notes(
        db,
        user_id=user_id,
        search_query=query,
        offset=offset,
        limit=limit + 1,
        note_type=note_type,
        tag=_normalize_filter(tag),
        language=_normalize_filter(language),
    )
    return _paginate_by_offset(notes, limit, offset)

def get_public_note(db: Session, share_uuid: str) -> Note:
    """
    Retrieves a note by its share UUID if it is published.
    """
    note = note_repo.get_by_share_uuid(db, share_uuid=share_uuid)
    if not note or not note.is_published:
        # Return 404 even if exists but not published (security)
        raise HTTPException(status_code=404, detail="Note not found")
    # Reading is a read. Counting happens through record_public_view, called
    # explicitly by the browser — see that function for why.
    return note_repo.get_public_note_response(db, note)


def record_public_view(db: Session, share_uuid: str) -> dict:
    """Count one read of a public note.

    This is a POST the browser makes after the page renders, not a side effect
    of fetching the note, because:

    * the public page is server-rendered, so a GET-side increment counted the
      Next.js server's fetch — including link prefetches and every crawler
      that never showed the page to a human;
    * a write on an unauthenticated GET is the one endpoint an anonymous
      caller can hammer, so it was trivially inflatable and a write
      amplification vector.

    De-duplication is per browser session, enforced by the caller (see
    RecordPublicView on the public page). A server-side dedupe key is not
    available here: requests arrive through the BFF proxy, so the peer address
    is the same for every reader and hashing it would collapse distinct
    readers into one.
    """
    note = note_repo.get_by_share_uuid(db, share_uuid=share_uuid)
    if not note or not note.is_published:
        raise HTTPException(status_code=404, detail="Note not found")

    with transaction(db):
        note_repo.increment_view_count(db, note.id)

    return {"view_count": (note.view_count or 0) + 1}


def get_related_public_notes(db: Session, share_uuid: str, limit: int = 3) -> list[dict]:
    note = note_repo.get_by_share_uuid(db, share_uuid=share_uuid)
    if not note or not note.is_published:
        raise HTTPException(status_code=404, detail="Note not found")
    return note_repo.get_related_public_notes(db, note=note, limit=limit)

def get_community_notes(
    db: Session,
    cursor: int | None = None,
    limit: int = 20,
    viewer_id: int | None = None,
    query: str | None = None,
    tag: str | None = None,
    sort: str = "recent",
) -> dict:
    """Retrieves community notes, optionally filtered by text and tag.

    `sort="trending"` ranks across the whole feed and returns a single
    bounded page: a leaderboard has a top, and rank order cannot be paged by
    an id cursor.
    """
    normalized_sort = "trending" if sort == "trending" else "recent"
    notes = note_repo.get_community_notes(
        db,
        cursor=cursor,
        limit=limit + 1,
        viewer_id=viewer_id,
        search_query=query,
        tag=_normalize_filter(tag),
        sort=normalized_sort,
    )
    if normalized_sort == "trending":
        return {"data": notes[:limit], "next_cursor": None}
    return _paginate(notes, limit)


def toggle_like(db: Session, user_id: int, note_id: int) -> dict:
    note = note_repo.get_by_note_id(db, note_id=note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if not note.is_published or not note.is_community:
        raise HTTPException(status_code=404, detail="Note not found")

    try:
        with transaction(db):
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
    except IntegrityError:
        # Double-click (or two tabs): the unique constraint on
        # (note_id, user_id) fired because the like already landed. That is
        # the state the caller asked for, so report it instead of letting the
        # SQLAlchemyError handler answer "database temporarily unavailable".
        return {
            "liked": True,
            "like_count": note_repo.get_like_count(db, note_id=note_id),
        }


def get_note_stats(db: Session, user_id: int) -> dict:
    """Workspace counters over every note the user owns.

    The dashboard previously derived these from the notes it had fetched, so
    each tile reported the first page and climbed as the user scrolled.
    """
    return note_repo.get_note_stats(db, user_id=user_id)


def get_activity(db: Session, user_id: int, weeks: int = 26) -> dict:
    """Daily activity for the heatmap, bounded so a caller cannot ask for an
    unbounded scan."""
    bounded_weeks = max(1, min(weeks, MAX_ACTIVITY_WEEKS))
    since = datetime.now(timezone.utc) - timedelta(weeks=bounded_weeks)
    return {
        "weeks": bounded_weeks,
        "since": since.date().isoformat(),
        "days": note_repo.get_activity(db, user_id=user_id, since=since),
    }


def get_community_stats(db: Session) -> dict:
    return note_repo.get_community_stats(db)
