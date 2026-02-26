from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.config import get_settings
from app.repositories import user_repo
from app.services.security import hash_password, verify_password
from app.models.user import User


def create_access_token(data: dict) -> str:
    """
    Creates a JWT token after successful login.

    How it works:
    1. We receive data like {"sub": "5"} (sub = subject = user ID)
    2. We add an expiration time (30 minutes from now)
    3. We SIGN it using SECRET_KEY — this is like a tamper-proof seal
    4. We return the token string

    The token looks like: eyJhbGciOiJIUz... (a long base64 string)
    Inside it contains: {"sub": "5", "exp": 1740000000}

    Anyone can READ the token (it's just base64), but nobody can
    MODIFY it without knowing the SECRET_KEY — the signature would break.
    """
    settings = get_settings()
    to_encode = data.copy()

    # Token expires in 30 minutes (configurable in .env)
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    # jwt.encode() creates the signed token
    # SECRET_KEY = the password used to sign
    # ALGORITHM = HS256 (HMAC-SHA256, the signing method)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str) -> dict:
    """
    Verifies a JWT token sent by the client.

    How it works:
    1. Client sends: Authorization: Bearer eyJhbGciOiJIUz...
    2. We decode the token using the SAME SECRET_KEY that signed it
    3. jose library automatically checks:
       - Is the signature valid? (was it signed by us?)
       - Is it expired? (is "exp" in the past?)
    4. If valid → returns the payload {"sub": "5", "exp": ...}
    5. If invalid/expired → raises JWTError

    This is called on EVERY protected request to verify the user.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise JWTError("Invalid or expired token") from e
    

def register_user(db: Session, email: str, name: str, password: str) -> User:
    """
    Registers a new user in the system.

    Business rules:
    1. Check if the email is already taken — reject duplicates (400).
    2. Hash the plain-text password using bcrypt (never store plain text).
    3. Persist the new user via the repository layer.
    4. Return the created User object (the router decides what to expose).

    Args:
        db: Active SQLAlchemy database session.
        email: The email address of the new user.
        name: The name of the new user.
        password: The plain-text password of the new user.

    Returns:
        The newly created User model instance.

    Raises:
        HTTPException 400: If the email is already registered.
    """

    # Check if email is already taken
    existing_user = user_repo.get_by_email(db, email=email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash the Password
    hashed_password = hash_password(password)  # "abc123" → "$2b$12$..."

    # Create the user with hashed password
    db_user = user_repo.create(db, name=name, email=email, hashed_password=hashed_password)
    return db_user       # FastAPI filters this through UserResponse

def authenticate_user(db: Session, email: str, password: str) -> dict:
    """
    Authenticates a user by email and password.

    Business rules:
    1. Look up the user by email — return a generic error if not found
       (never reveal whether the email exists).
    2. Verify the plain-text password against the stored bcrypt hash.
    3. Generate a signed JWT access token containing the user's ID.
    4. Return the token and its type.

    Args:
        db: Active SQLAlchemy database session.
        email: The email address of the user to authenticate.
        password: The plain-text password of the user to authenticate.

    Returns:
        A dict with "access_token" (JWT string) and "token_type" ("bearer").

    Raises:
        HTTPException 401: If email is not found or password doesn't match.
    """

    # Find user by email
    db_user = user_repo.get_by_email(db, email=email)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password against stored hash
    if not verify_password(password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create JWT token with user ID
    access_token = create_access_token({"sub": str(db_user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",  # tells the client how to send it (Authorization: Bearer ...)
    }