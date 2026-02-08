from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteResponse

router = APIRouter(prefix="/notes", tags=["notes"])


# ============ CREATE ============
@router.post("/", response_model=NoteResponse, status_code=201)
def create_note(note: NoteCreate, db: Session = Depends(get_db)):
    """
    POST /notes/
    Body: {"title": "...", "content": "..."}
    
    Flow:
    1. FastAPI validates the request body using NoteCreate schema
    2. Depends(get_db) creates a database session
    3. We create a Note object and save it to Aurora
    4. FastAPI converts the Note object to NoteResponse schema
    """
    db_note = Note(title=note.title, content=note.content)
    db.add(db_note)         # Stage the insert
    db.commit()             # Execute the INSERT in Aurora
    db.refresh(db_note)     # Reload to get id, created_at from Aurora
    return db_note


# ============ READ ALL ============
@router.get("/", response_model=list[NoteResponse])
def list_notes(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """
    GET /notes/?skip=0&limit=20
    
    Returns paginated list of notes.
    """
    return db.query(Note).offset(skip).limit(limit).all()


# ============ READ ONE ============
@router.get("/{note_id}", response_model=NoteResponse)
def get_note(note_id: int, db: Session = Depends(get_db)):
    """
    GET /notes/42
    
    Returns a single note or 404.
    """
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


# ============ UPDATE ============
@router.put("/{note_id}", response_model=NoteResponse)
def update_note(note_id: int, note_data: NoteCreate, db: Session = Depends(get_db)):
    """
    PUT /notes/42
    Body: {"title": "...", "content": "..."}
    """
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.title = note_data.title
    note.content = note_data.content
    db.commit()
    db.refresh(note)
    return note


# ============ DELETE ============
@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    """
    DELETE /notes/42
    """
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()