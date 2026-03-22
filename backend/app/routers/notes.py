"""
Notes Router — CRUD API endpoints for notes.

All routes require authentication (Depends(get_current_user)).
The JWT token is extracted from the Authorization header automatically.

Endpoints:
    POST   /notes/create       → Create a new note
    GET    /notes/notes         → List all notes for the logged-in user
    GET    /notes/{id}          → Get a single note by ID
    PATCH  /notes/{id}/update   → Update an existing note
    DELETE /notes/{id}/delete   → Delete a note

Flow: Router → Service (business logic) → Repository (database queries)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate, PublicNoteResponse
from app.services import note_service


router = APIRouter(prefix="/notes",tags=["notes"])

# ════════════════════════════════════════════
#  POST /notes/create — Create a new note
# ════════════════════════════════════════════
# - NoteCreate schema validates the request body (title + content required)
# - response_model=NoteResponse filters what gets returned (hides user_id internals)
# - status_code=201 = HTTP "Created" (not the default 200)
# - Depends(get_current_user) extracts user from JWT — note is linked to this user
@router.post("/create",response_model=NoteResponse,status_code=201)
def my_notes(note: NoteCreate,user= Depends(get_current_user),db :Session = Depends(get_db)):
    return note_service.create_note(
        db,
        user_id=user.id,
        title=note.title,
        content=note.content,
        tags=note.tags,
    )

# ════════════════════════════════════════════
#  PATCH /notes/{id}/update — Update a note
# ════════════════════════════════════════════
# - {id} is a path parameter — FastAPI extracts it from the URL
# - PATCH (not PUT) = partial update — can update title, content, or both
# - NoteUpdate schema has all fields optional (title: str | None = None)
# - Service layer verifies the note belongs to the authenticated user
@router.patch("/{id}/update",response_model=NoteResponse,status_code=200)
def update_note(id: int, note: NoteUpdate,user= Depends(get_current_user),db :Session = Depends(get_db)):
    return note_service.update_note(
        db,
        note_id=id,
        title=note.title,
        content=note.content,
        tags=note.tags,
        is_published=note.is_published,
        is_community=note.is_community,
        user_id=user.id,
    )

# ════════════════════════════════════════════
#  DELETE /notes/{id}/delete — Delete a note
# ════════════════════════════════════════════
# - status_code=204 = "No Content" — success but no response body
# - The frontend catches 204 specially (no JSON to parse)
# - Service layer verifies ownership before deleting
@router.delete("/{id}/delete",status_code=204)
def delete_note(id: int,user= Depends(get_current_user),db :Session = Depends(get_db)):
    return note_service.delete_note(db, note_id=id,user_id=user.id)

# ════════════════════════════════════════════
#  GET /notes/notes — List all user's notes
# ════════════════════════════════════════════
# - response_model=list[NoteResponse] tells FastAPI to return a JSON array
# - Only returns notes belonging to the authenticated user (user_id filter)
@router.get("/notes",response_model=list[NoteResponse],status_code=200)
def get_my_notes(user= Depends(get_current_user),db :Session = Depends(get_db)):
    return note_service.get_my_notes(db, user_id=user.id)

# ════════════════════════════════════════════
#  GET /notes/community — List community notes
# ════════════════════════════════════════════
# - Requires authentication (internal feed)
# - Returns all notes with is_community=True
@router.get("/community", response_model=list[NoteResponse], status_code=200)
def get_community_notes(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return note_service.get_community_notes(db)

# ════════════════════════════════════════════
#  GET /notes/{id} — Get a single note
# ════════════════════════════════════════════
# - Used by the edit page to fetch note data before editing
# - Service layer returns 404 if not found, 403 if not the owner
@router.get("/{id}",response_model=NoteResponse,status_code=200)
def get_note(id: int, user= Depends(get_current_user),db : Session = Depends(get_db)):
    return note_service.get_note(db, note_id=id,user_id=user.id)

# ════════════════════════════════════════════
#  PATCH /notes/{id}/pin — Toggle pin on a note
# ════════════════════════════════════════════
# - Flips is_pinned: true → false, false → true
# - Pinned notes are sorted to the top on the frontend
@router.patch("/{id}/pin", response_model=NoteResponse, status_code=200)
def pin_note(id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    return note_service.toggle_pin(db, note_id=id, user_id=user.id)

# ════════════════════════════════════════════
#  GET /notes/public/{share_uuid} — Get a public note
# ════════════════════════════════════════════
# - No authentication required
# - Returns note data if share_uuid matches AND is_published=True
# - Uses PublicNoteResponse to avoid leaking user_id
@router.get("/public/{share_uuid}", response_model=PublicNoteResponse, status_code=200)
def get_public_note(share_uuid: str, db: Session = Depends(get_db)):
    return note_service.get_public_note(db, share_uuid=share_uuid)
