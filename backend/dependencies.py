from collections.abc import Generator
from sqlalchemy.orm import Session
from app.database import SessionLocal
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from app.services.auth import verify_token
from models.user import User
from database import get_db
from sqlalchemy.orm import Session

oAuth2Scheme = OAuth2PasswordBearer(tokenUrl="login")

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

def get_current_user(token: str = Depends(oAuth2Scheme), db: Session = Depends(get_db)) -> User:
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
        payload = verify_token(token)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
        
        user = db.query(User).filter(User.id == int(user_id)).first()

        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e)) from e