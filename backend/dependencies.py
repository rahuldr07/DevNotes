from collections.abc import Generator
from sqlalchemy.orm import Session
from app.database import SessionLocal


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