from collections.abc import Generator
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from app.database import SessionLocal
from app.services.auth import verify_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db() -> Generator[Session, None, None]:
    """
    Creates a database session for a single request.

    How it works:
    1. Request comes in → db = SessionLocal() creates a new session
    2. 'yield db' gives the session to your route function
    3. Request ends (success or error) → 'finally' block closes the session

    The 'yield' keyword makes this a generator.
    FastAPI knows: everything before yield = setup, everything after = cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Retrieves the current user based on the provided JWT token.

    Args:
        token: The JWT token extracted from the Authorization header.
        db: The database session for querying user information.

    Returns:
        The User object corresponding to the token's claims.

    Raises:
        HTTPException: If the token is invalid or the user does not exist.
    """
    try:
        payload = verify_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing subject")

        user = db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e)) from e