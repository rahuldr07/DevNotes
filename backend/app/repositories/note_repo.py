from sqlalchemy.orm import Session

from app.models.note import Note


def create(db: Session, user_id: int, title: str, content: str)-> Note | None:
    oNote = Note(user_id=user_id, title=title, content=content)
    db.add(oNote)
    db.commit()
    db.refresh(oNote)
    return oNote

def get_by_note_id(db: Session, note_id: int) -> Note | None:
    note = db.query(Note).filter(Note.id == note_id).first()
    return note

def update(db: Session, note_id: int, title: str, content: str) -> Note | None:
    oNote = db.query(Note).filter(Note.id == note_id).first()
    if oNote:
        if title:
            oNote.title = title
        if content:
            oNote.content = content
        db.commit()
        db.refresh(oNote)
        return oNote
    return None

def delete(db: Session, note_id: int) -> None:
    oNote = db.query(Note).filter(Note.id == note_id).first()
    if oNote:
        db.delete(oNote)
        db.commit()
    return None

def get_my_notes(db:Session, user_id: int) -> list[Note]:
    notes = db.query(Note).filter(Note.user_id == user_id).all()
    return notes