from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories import note_repo, user_repo


def get_public_profile(db: Session, username: str) -> dict:
    user = user_repo.get_by_username(db, username=username.lower())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "username": user.username,
        "name": user.name,
        "created_at": user.created_at,
        "public_notes": note_repo.get_public_notes_for_user(db, user_id=user.id),
    }
