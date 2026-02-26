from collections.abc import Generator
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from app.database import SessionLocal
from app.services.auth_service import verify_access_token
from app.models.user import User
from app.repositories import user_repo

# OAuth2PasswordBearer tells FastAPI:
# "Look for a token in the Authorization header as: Bearer <token>"
# tokenUrl="/auth/login" is just for Swagger UI — it shows a login button
# that points to your login endpoint.
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
    Extracts and validates the JWT token, then returns the User object.

    HOW TO USE in any route:
        @router.get("/my-stuff")
        def my_stuff(user: User = Depends(get_current_user)):
            # 'user' is the authenticated user — guaranteed to exist
            return {"hello": user.name}

    WHAT HAPPENS:
    1. FastAPI sees Depends(oauth2_scheme) → extracts token from
       "Authorization: Bearer eyJhbGci..." header
    2. FastAPI sees Depends(get_db) → creates a database session
    3. We verify the token → get the payload {"sub": "5", "exp": ...}
    4. We extract user_id from "sub" and query the database
    5. If everything checks out → return the User object
    6. If anything fails → 401 Unauthorized

    This is DEPENDENCY INJECTION — FastAPI auto-resolves the chain:
    oauth2_scheme → token → get_current_user → your route function
    """
    try:
        # Verify the JWT signature and expiration
        payload = verify_access_token(token)

        # Extract user ID from the "sub" (subject) claim
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing subject")

        # Look up the user in the database
        user = user_repo.get_by_id(db, user_id=int(user_id))
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e)) from e