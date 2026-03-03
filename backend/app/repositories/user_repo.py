"""
User Repository — Database queries for the users table.

This is the ONLY layer that talks directly to the database for user operations.
All functions receive a SQLAlchemy Session and return User model instances.

Pattern:  Router → Service (business logic) → Repository (THIS FILE) → Database

The repository does NOT contain business logic (validation, authorization).
It just executes queries and returns results.
"""
from sqlalchemy.orm import Session

from app.models.user import User


def get_by_email(db: Session, email: str) -> User | None:
    """
    Finds a user by their email address.
    Returns None if no user exists with that email.

    Used by:
    - register_user() → to check if email is already taken
    - authenticate_user() → to find the user for login
    """
    oUser = db.query(User).filter(User.email == email).first()
    return oUser

def get_by_id(db: Session, user_id: int) -> User | None:
    """
    Finds a user by their primary key ID.
    Returns None if no user exists with that ID.

    Used by:
    - get_current_user() in dependencies.py → to resolve JWT "sub" to a User object
    """
    oUser = db.query(User).filter(User.id == user_id).first()
    return oUser

def create(db: Session, name: str, email: str, hashed_password: str) -> User:
    """
    Creates a new user in the database.

    Steps:
    1. db.add(oUser)    → Stages the object (like git add)
    2. db.commit()      → Writes to the database (like git commit)
    3. db.refresh(oUser) → Reloads the object from DB to get generated fields
                           (id, created_at, which are set by PostgreSQL)

    Note: Receives hashed_password, NOT plain text.
          The service layer hashes it before calling this function.
    """
    oUser = User(name=name, email=email, hashed_password=hashed_password)
    db.add(oUser)
    db.commit()
    db.refresh(oUser)
    return oUser