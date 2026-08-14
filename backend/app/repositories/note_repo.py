"""
Note Repository — Database queries for the notes table.

This is the ONLY layer that talks directly to the database for note operations.
All functions receive a SQLAlchemy Session and return Note model instances.

Pattern:  Router → Service (business logic) → Repository (THIS FILE) → Database

The repository does NOT check ownership or authorization.
That's the service layer's job (note_service.py).

It also does NOT commit. Functions here stage and flush; the service wraps
related writes in `database.transaction(db)` so one request is one unit of
work. Flushing (rather than committing) still assigns primary keys and lets
`db.refresh` read server defaults, so callers see a complete object.
"""
import re
from datetime import datetime

from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.models.note import Note
from app.models.note_like import NoteLike
from app.models.note_version import NoteVersion
from app.models.user import User


def _search_terms(search_query: str) -> list[str]:
    """Extract normalized terms used by fallback retrieval and tests."""
    return [term for term in re.findall(r"[\w#+.-]+", search_query.lower()) if term]


def _fallback_search_score(note: Note, terms: list[str]) -> int:
    """Small lexical ranker for SQLite/dev and as a semantic-search stepping stone.

    Title and tags are weighted above body matches because they represent explicit
    intent. Phrase matches receive an additional boost so searches like
    "docker compose" rank exact notes above scattered token hits.
    """
    if not terms:
        return 0

    title = (note.title or "").lower()
    content = (note.content or "").lower()
    tags = [tag.lower() for tag in (note.tags or [])]
    phrase = " ".join(terms)
    score = 0

    if phrase and phrase in title:
        score += 24
    if phrase and phrase in content:
        score += 8

    for term in terms:
        if term in title:
            score += 12
            if title.startswith(term):
                score += 4
        if any(term == tag or term in tag for tag in tags):
            score += 18
        if term in content:
            score += 3
            score += min(content.count(term), 5)
        if term == getattr(note, "note_type", ""):
            score += 4
        language = getattr(note, "language", None)
        if language and term == language.lower():
            score += 4

    return score


def create(
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
    Creates a new note in the database.

    Steps:
    1. db.add()     → Stages the Note object for insertion
    2. db.flush()   → Sends the INSERT, assigning id
    3. db.refresh() → Reads DB-generated fields (created_at, note_type default)

    The enclosing `transaction(db)` in the service commits.
    """
    oNote = Note(
        user_id=user_id,
        title=title,
        content=content,
        tags=tags or [],
        note_type=note_type,
        language=language,
        source_url=source_url,
    )
    db.add(oNote)
    db.flush()
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
    note_type: str | None = None,
    language: str | None = None,
    source_url: str | None = None,
    is_published: bool | None = None,
    is_listed: bool | None = None,
    is_community: bool | None = None,
    share_uuid: str | None = None,
) -> Note | None:
    """
    Updates an existing note's title and/or content.

    Only updates fields that are not None/empty (partial update support).

    `updated_at` is set here rather than by a column-level onupdate, so that
    visibility switches (publish, explore) do not reorder the note in
    "recently touched" views. Only a change to what the note *says* counts.
    """
    oNote = db.query(Note).filter(Note.id == note_id).first()
    if oNote:
        content_touched = False
        if title is not None and title != oNote.title:
            oNote.title = title
            content_touched = True
        if content is not None and content != oNote.content:
            oNote.content = content
            content_touched = True
        if tags is not None and list(tags) != list(oNote.tags or []):
            oNote.tags = tags
            content_touched = True
        if note_type is not None and note_type != oNote.note_type:
            oNote.note_type = note_type
            content_touched = True
        if language is not None and (language or None) != oNote.language:
            oNote.language = language or None
            content_touched = True
        if source_url is not None and (source_url or None) != oNote.source_url:
            oNote.source_url = source_url or None
            content_touched = True
        if content_touched:
            oNote.updated_at = func.now()
        if is_published is not None:
            oNote.is_published = is_published
            if is_published is False:
                # Unpublishing withdraws every downstream surface at once.
                oNote.is_listed = False
                oNote.is_community = False
        if is_listed is not None:
            oNote.is_listed = is_listed and oNote.is_published
        if is_community is not None:
            oNote.is_community = is_community and oNote.is_published
        if share_uuid is not None:
            oNote.share_uuid = share_uuid
        db.flush()
        db.refresh(oNote)
        return oNote
    return None


def get_latest_version_number(db: Session, note_id: int) -> int:
    latest = (
        db.query(func.max(NoteVersion.version_number))
        .filter(NoteVersion.note_id == note_id)
        .scalar()
    )
    return latest or 0


def create_note_version(
    db: Session,
    note_id: int,
    title: str,
    content: str,
    tags: list[str],
    version_number: int,
) -> NoteVersion:
    version = NoteVersion(
        note_id=note_id,
        title=title,
        content=content,
        tags=tags or [],
        version_number=version_number,
    )
    db.add(version)
    db.flush()
    return version


def trim_note_versions(
    db: Session,
    note_id: int,
    max_versions: int = 20,
) -> None:
    old_versions = (
        db.query(NoteVersion)
        .filter(NoteVersion.note_id == note_id)
        .order_by(NoteVersion.version_number.desc())
        .offset(max_versions)
        .all()
    )
    for version in old_versions:
        db.delete(version)
    if old_versions:
        db.flush()


def get_note_versions(db: Session, note_id: int) -> list[NoteVersion]:
    return (
        db.query(NoteVersion)
        .filter(NoteVersion.note_id == note_id)
        .order_by(NoteVersion.version_number.desc())
        .all()
    )


def get_note_version_by_id(
    db: Session,
    note_id: int,
    version_id: int,
) -> NoteVersion | None:
    return (
        db.query(NoteVersion)
        .filter(NoteVersion.note_id == note_id, NoteVersion.id == version_id)
        .first()
    )

def delete(db: Session, note_id: int) -> None:
    """
    Permanently deletes a note from the database.

    db.delete() marks it for deletion, the flush issues the DELETE.
    Returns None regardless (the service layer handles error responses).
    """
    oNote = db.query(Note).filter(Note.id == note_id).first()
    if oNote:
        db.delete(oNote)
        db.flush()
    return None

def get_my_notes(
    db:Session,
    user_id: int,
    cursor: int | None = None,
    limit: int = 20,
    note_type: str | None = None,
) -> list[Note]:
    """
    Fetches all notes belonging to a specific user.

    Uses .filter(Note.user_id == user_id) to ensure users
    only see their own notes (data isolation).
    """
    query = db.query(Note).filter(Note.user_id == user_id)
    if note_type:
        query = query.filter(Note.note_type == note_type)
    if cursor is not None:
        query = query.filter(Note.id < cursor)
    return query.order_by(Note.id.desc()).limit(limit).all()


def search_notes(
    db: Session,
    user_id: int,
    search_query: str,
    offset: int | None = None,
    limit: int = 20,
    note_type: str | None = None,
    tag: str | None = None,
    language: str | None = None,
) -> list[Note]:
    terms = _search_terms(search_query)
    if not terms:
        return []

    base_query = db.query(Note).filter(Note.user_id == user_id)
    if note_type:
        base_query = base_query.filter(Note.note_type == note_type)
    if language:
        base_query = base_query.filter(func.lower(Note.language) == language.lower())

    # Search paginates by offset, not by `id < cursor`. Results are ordered by
    # relevance, and relevance has no relationship to id — filtering by id
    # would drop every lower-ranked row that happens to have a higher id, and
    # repeat rows that do not. `offset` is the number of rows already shown.
    skip = max(0, offset or 0)

    if db.bind and db.bind.dialect.name == "postgresql":
        if tag:
            # Tags are normalized to lowercase on write (normalize_tags),
            # so an exact array-contains match is safe here.
            base_query = base_query.filter(Note.tags.contains([tag.lower()]))
        ts_query = func.websearch_to_tsquery("english", search_query)
        rank = func.ts_rank(Note.search_vector, ts_query)
        return (
            base_query.filter(Note.search_vector.op("@@")(ts_query))
            .order_by(desc(rank), Note.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    ilike_filters = []
    for term in terms:
        pattern = f"%{term}%"
        ilike_filters.extend([Note.title.ilike(pattern), Note.content.ilike(pattern)])

    candidates = (
        base_query.filter(or_(*ilike_filters)).limit(max((skip + limit) * 4, 40)).all()
    )
    if tag:
        wanted = tag.lower()
        candidates = [
            note
            for note in candidates
            if wanted in [t.lower() for t in (note.tags or [])]
        ]
    ranked = [
        (score, note)
        for note in candidates
        if (score := _fallback_search_score(note, terms)) > 0
    ]
    ranked.sort(key=lambda item: (item[0], item[1].id), reverse=True)
    return [note for _, note in ranked[skip : skip + limit]]

def toggle_pin(db: Session, note_id: int) -> Note:
    """Flips is_pinned on a note and returns the updated note."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if note:
        note.is_pinned = not note.is_pinned
        db.flush()
        db.refresh(note)
    return note

def get_by_share_uuid(db: Session, share_uuid: str) -> Note | None:
    """Finds a note by its share_uuid."""
    return db.query(Note).filter(Note.share_uuid == share_uuid).first()

def _community_response(
    note: Note,
    author_name: str,
    author_username: str | None = None,
    liked_by_me: bool = False,
) -> dict:
    return {
        "id": note.id,
        "author_name": author_name,
        "author_username": author_username,
        "liked_by_me": liked_by_me,
        "title": note.title,
        "content": note.content,
        "tags": note.tags,
        "note_type": getattr(note, "note_type", "note"),
        "language": getattr(note, "language", None),
        "source_url": getattr(note, "source_url", None),
        "is_pinned": note.is_pinned,
        "share_uuid": note.share_uuid,
        "is_published": note.is_published,
        "is_listed": getattr(note, "is_listed", False),
        "is_community": note.is_community,
        "like_count": getattr(note, "like_count", 0),
        "view_count": note.view_count or 0,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    }


def _public_response(note: Note, like_count: int) -> dict:
    return {
        "title": note.title,
        "content": note.content,
        "tags": note.tags,
        "note_type": getattr(note, "note_type", "note"),
        "language": getattr(note, "language", None),
        "source_url": getattr(note, "source_url", None),
        "share_uuid": note.share_uuid,
        "is_published": note.is_published,
        "is_community": note.is_community,
        "like_count": like_count,
        "view_count": note.view_count or 0,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    }


def get_community_notes(
    db: Session,
    cursor: int | None = None,
    limit: int = 20,
    viewer_id: int | None = None,
) -> list[dict]:
    """Fetches published community notes only, with the viewer's like state."""
    like_count = func.count(NoteLike.id).label("like_count")
    liked_by_me = func.coalesce(
        func.bool_or(NoteLike.user_id == viewer_id), False
    ).label("liked_by_me")
    query = (
        db.query(Note, User.name, User.username)
        .join(User, Note.user_id == User.id)
        .outerjoin(NoteLike, NoteLike.note_id == Note.id)
        .filter(Note.is_community == True, Note.is_published == True)
        .group_by(Note.id, User.name, User.username)
        .add_columns(like_count, liked_by_me)
    )
    if cursor is not None:
        query = query.filter(Note.id < cursor)
    rows = query.order_by(Note.id.desc()).limit(limit).all()
    return [
        _community_response(
            note,
            author_name,
            author_username=author_username,
            liked_by_me=bool(liked),
        )
        | {"like_count": like_count}
        for note, author_name, author_username, like_count, liked in rows
    ]


def increment_view_counts(db: Session, note_ids: list[int]) -> None:
    if not note_ids:
        return
    (
        db.query(Note)
        .filter(Note.id.in_(note_ids))
        .update({Note.view_count: Note.view_count + 1}, synchronize_session=False)
    )
    db.flush()


def increment_view_count(db: Session, note_id: int) -> None:
    increment_view_counts(db, [note_id])


def get_like_count(db: Session, note_id: int) -> int:
    return db.query(NoteLike).filter(NoteLike.note_id == note_id).count()


def get_public_note_response(db: Session, note: Note) -> dict:
    response = _public_response(note, get_like_count(db, note.id))
    author = db.query(User).filter(User.id == note.user_id).first()
    if author:
        response["author_name"] = author.name
        response["author_username"] = author.username
    return response


def get_related_public_notes(
    db: Session,
    note: Note,
    limit: int = 3,
) -> list[dict]:
    """Returns public notes related by author and tags.

    Same-author notes are most useful for public reading continuity. Shared tags
    rank above generic recency so articles feel intentionally connected.
    """
    candidates = (
        db.query(Note)
        .filter(
            Note.id != note.id,
            Note.is_published == True,
            Note.is_listed == True,
            Note.share_uuid.isnot(None),
        )
        .order_by(Note.id.desc())
        .limit(80)
        .all()
    )
    source_tags = set(note.tags or [])

    def score(candidate: Note) -> tuple[int, int]:
        tag_overlap = len(source_tags.intersection(candidate.tags or []))
        same_author = 1 if candidate.user_id == note.user_id else 0
        same_type = 1 if candidate.note_type == note.note_type else 0
        return (same_author * 20 + tag_overlap * 8 + same_type * 2, candidate.id)

    ranked = sorted(candidates, key=score, reverse=True)[:limit]
    return [
        {
            "title": candidate.title,
            "content": candidate.content,
            "tags": candidate.tags,
            "note_type": candidate.note_type,
            "language": candidate.language,
            "source_url": candidate.source_url,
            "share_uuid": candidate.share_uuid,
            "is_published": candidate.is_published,
            "is_community": candidate.is_community,
            "like_count": get_like_count(db, candidate.id),
            "view_count": candidate.view_count or 0,
            "created_at": candidate.created_at,
            "updated_at": candidate.updated_at,
        }
        for candidate in ranked
    ]


def get_public_notes_for_user(db: Session, user_id: int) -> list[dict]:
    like_count = func.count(NoteLike.id).label("like_count")
    rows = (
        db.query(Note, like_count)
        .outerjoin(NoteLike, NoteLike.note_id == Note.id)
        .filter(
            Note.user_id == user_id,
            Note.is_published == True,
            Note.is_listed == True,
        )
        .group_by(Note.id)
        .order_by(Note.id.desc())
        .all()
    )
    return [
        {
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "share_uuid": note.share_uuid,
            "tags": note.tags,
            "note_type": note.note_type,
            "language": note.language,
            "source_url": note.source_url,
            "like_count": count,
            "view_count": note.view_count or 0,
            "created_at": note.created_at,
            "updated_at": note.updated_at,
        }
        for note, count in rows
    ]


def get_like(db: Session, note_id: int, user_id: int) -> NoteLike | None:
    return (
        db.query(NoteLike)
        .filter(NoteLike.note_id == note_id, NoteLike.user_id == user_id)
        .first()
    )


def create_like(db: Session, note_id: int, user_id: int) -> NoteLike:
    like = NoteLike(note_id=note_id, user_id=user_id)
    db.add(like)
    db.flush()
    db.refresh(like)
    return like


def delete_like(db: Session, like: NoteLike) -> None:
    db.delete(like)
    db.flush()


# ════════════════════════════════════════════
#  Aggregates
# ════════════════════════════════════════════
#
# These exist because the dashboard used to count the notes it had loaded.
# With cursor pagination that meant every tile ("total notes", "published",
# "tags") reported the first page, and the numbers grew as the user scrolled.
# Counting belongs in the database.

def get_note_stats(db: Session, user_id: int) -> dict:
    """One pass over the user's notes for every dashboard counter."""
    row = (
        db.query(
            func.count(Note.id).label("total"),
            func.count(Note.id).filter(Note.is_published == True).label("published"),
            func.count(Note.id).filter(Note.is_listed == True).label("listed"),
            func.count(Note.id).filter(Note.is_community == True).label("community"),
            func.count(Note.id).filter(Note.is_pinned == True).label("pinned"),
            func.count(Note.id).filter(Note.note_type == "snippet").label("snippets"),
            func.count(Note.id).filter(Note.note_type == "guide").label("guides"),
            func.count(Note.id).filter(Note.note_type == "checklist").label("checklists"),
            func.coalesce(func.sum(Note.view_count), 0).label("views"),
        )
        .filter(Note.user_id == user_id)
        .one()
    )

    total = int(row.total or 0)
    published = int(row.published or 0)
    return {
        "total": total,
        "published": published,
        "private": total - published,
        "listed": int(row.listed or 0),
        "community": int(row.community or 0),
        "pinned": int(row.pinned or 0),
        "snippets": int(row.snippets or 0),
        "guides": int(row.guides or 0),
        "checklists": int(row.checklists or 0),
        "views": int(row.views or 0),
        "tags": get_tag_counts(db, user_id=user_id),
        "languages": get_language_counts(db, user_id=user_id),
    }


def get_tag_counts(db: Session, user_id: int, limit: int | None = None) -> list[dict]:
    """Tag histogram across every note the user owns, not just the loaded page."""
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        tag = func.unnest(Note.tags).label("tag")
        query = (
            db.query(tag, func.count().label("count"))
            .filter(Note.user_id == user_id)
            .group_by(tag)
            .order_by(desc("count"), "tag")
        )
        if limit:
            query = query.limit(limit)
        return [{"tag": name, "count": int(count)} for name, count in query.all()]

    # Non-Postgres dev databases have no unnest; fold the arrays in Python.
    counts: dict[str, int] = {}
    for (tags,) in db.query(Note.tags).filter(Note.user_id == user_id).all():
        for name in tags or []:
            counts[name] = counts.get(name, 0) + 1
    ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    if limit:
        ordered = ordered[:limit]
    return [{"tag": name, "count": count} for name, count in ordered]


def get_language_counts(db: Session, user_id: int) -> list[dict]:
    rows = (
        db.query(Note.language, func.count(Note.id).label("count"))
        .filter(
            Note.user_id == user_id,
            Note.note_type == "snippet",
            Note.language.isnot(None),
        )
        .group_by(Note.language)
        .order_by(Note.language)
        .all()
    )
    return [{"language": language, "count": int(count)} for language, count in rows]


def get_activity(db: Session, user_id: int, since: datetime) -> list[dict]:
    """Daily note activity for the knowledge heatmap.

    A note counts on the day it was created, and again on the day it was last
    updated when that is a different day — the same rule the client used, but
    over every note instead of the newest hundred.
    """
    created_day = func.date(Note.created_at).label("day")
    updated_day = func.date(Note.updated_at).label("day")

    counts: dict[str, int] = {}

    created_rows = (
        db.query(created_day, func.count(Note.id))
        .filter(Note.user_id == user_id, Note.created_at >= since)
        .group_by(created_day)
        .all()
    )
    for day, count in created_rows:
        if day is None:
            continue
        counts[str(day)] = counts.get(str(day), 0) + int(count)

    updated_rows = (
        db.query(updated_day, func.count(Note.id))
        .filter(
            Note.user_id == user_id,
            Note.updated_at.isnot(None),
            Note.updated_at >= since,
            func.date(Note.updated_at) != func.date(Note.created_at),
        )
        .group_by(updated_day)
        .all()
    )
    for day, count in updated_rows:
        if day is None:
            continue
        counts[str(day)] = counts.get(str(day), 0) + int(count)

    return [
        {"date": day, "count": count}
        for day, count in sorted(counts.items())
    ]


def get_community_stats(db: Session) -> dict:
    row = (
        db.query(
            func.count(func.distinct(Note.id)).label("notes"),
            func.coalesce(func.sum(Note.view_count), 0).label("views"),
        )
        .filter(Note.is_community == True, Note.is_published == True)
        .one()
    )
    likes = (
        db.query(func.count(NoteLike.id))
        .join(Note, Note.id == NoteLike.note_id)
        .filter(Note.is_community == True, Note.is_published == True)
        .scalar()
    )
    authors = (
        db.query(func.count(func.distinct(Note.user_id)))
        .filter(Note.is_community == True, Note.is_published == True)
        .scalar()
    )
    return {
        "notes": int(row.notes or 0),
        "views": int(row.views or 0),
        "likes": int(likes or 0),
        "authors": int(authors or 0),
        "topics": get_community_topics(db, limit=12),
    }


def get_community_topics(db: Session, limit: int = 12) -> list[dict]:
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        tag = func.unnest(Note.tags).label("tag")
        rows = (
            db.query(tag, func.count().label("count"))
            .filter(Note.is_community == True, Note.is_published == True)
            .group_by(tag)
            .order_by(desc("count"), "tag")
            .limit(limit)
            .all()
        )
        return [{"tag": name, "count": int(count)} for name, count in rows]

    counts: dict[str, int] = {}
    rows = (
        db.query(Note.tags)
        .filter(Note.is_community == True, Note.is_published == True)
        .all()
    )
    for (tags,) in rows:
        for name in tags or []:
            counts[name] = counts.get(name, 0) + 1
    ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:limit]
    return [{"tag": name, "count": count} for name, count in ordered]
