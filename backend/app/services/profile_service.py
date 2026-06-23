from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories import note_repo, user_repo
from app.models.user import User


def get_public_profile(db: Session, username: str) -> dict:
    user = user_repo.get_by_username(db, username=username.lower())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "username": user.username,
        "name": user.name,
        "bio": user.bio,
        "website_url": user.website_url,
        "github_url": user.github_url,
        "twitter_url": user.twitter_url,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at,
        "public_notes": note_repo.get_public_notes_for_user(db, user_id=user.id),
    }


def update_my_profile(db: Session, user: User, **fields) -> User:
    username = fields.get("username")
    if username and username != user.username:
        existing = user_repo.get_by_username(db, username=username)
        if existing and existing.id != user.id:
            raise HTTPException(status_code=409, detail="Username is already taken")
    return user_repo.update_profile(db, user, **fields)
