from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate
from app.services import note_service


router = APIRouter(prefix="/notes",tags=["notes"])

@router.post("/create",response_model=NoteResponse,status_code=201)
def my_notes(note: NoteCreate,user= Depends(get_current_user),db :Session = Depends(get_db)):
    return note_service.create_note(db, user_id=user.id, title=note.title, content=note.content)

@router.patch("/{id}/update",response_model=NoteResponse,status_code=200)
def update_note(id: int, note: NoteUpdate,user= Depends(get_current_user),db :Session = Depends(get_db)):
    return note_service.update_note(db, note_id=id, title=note.title, content=note.content,user_id=user.id)

@router.delete("/{id}/delete",status_code=204)
def delete_note(id: int,user= Depends(get_current_user),db :Session = Depends(get_db)):
    return note_service.delete_note(db, note_id=id,user_id=user.id)

@router.get("/notes",response_model=list[NoteResponse],status_code=200)
def get_my_notes(user= Depends(get_current_user),db :Session = Depends(get_db)):
    return note_service.get_my_notes(db, user_id=user.id)

@router.get("/{id}",response_model=NoteResponse,status_code=200)
def get_note(id: int, user= Depends(get_current_user),db : Session = Depends(get_db)):
    return note_service.get_note(db, note_id=id,user_id=user.id)