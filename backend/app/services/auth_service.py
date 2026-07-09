from datetime import datetime, timezone, timedelta
import re
import uuid
from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.config import get_settings
from app.repositories import session_repo, user_repo
from app.services.security import (
    hash_password,
    hash_token,
    verify_password,
    verify_token_hash,
)
from app.models.user import User

REFRESH_TOKEN_EXPIRE_DAYS = 7
REMEMBER_ME_REFRESH_EXPIRE_DAYS = 30
USERNAME_MAX_LENGTH = 30


def _refresh_expire_days(remember_me: bool) -> int:
    return REMEMBER_ME_REFRESH_EXPIRE_DAYS if remember_me else REFRESH_TOKEN_EXPIRE_DAYS


def _username_base(name: str) -> str:
    base = re.sub(r"\s+", "-", name.strip().lower())
    base = re.sub(r"[^a-z0-9-]", "", base).strip("-")
    return (base or "user")[:USERNAME_MAX_LENGTH]


def generate_unique_username(db: Session, name: str) -> str:
    base = _username_base(name)
    candidate = base
    counter = 1
    while user_repo.get_by_username(db, candidate) is not None:
        suffix = f"-{counter}"
        candidate = f"{base[:USERNAME_MAX_LENGTH - len(suffix)]}{suffix}"
        counter += 1
    return candidate


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


def create_refresh_token(data: dict, expires_days: int = REFRESH_TOKEN_EXPIRE_DAYS) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=expires_days)
    to_encode.update({"exp": expire, "token_type": "refresh", "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def refresh_token_expires_at(expires_days: int = REFRESH_TOKEN_EXPIRE_DAYS) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=expires_days)


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


def verify_refresh_token(token: str) -> dict:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("token_type") != "refresh":
            raise JWTError("Invalid refresh token")
        return payload
    except JWTError as e:
        raise JWTError("Invalid or expired refresh token") from e
    

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

    username = generate_unique_username(db, name)

    # Create the user with hashed password
    db_user = user_repo.create(
        db,
        name=name,
        email=email,
        hashed_password=hashed_password,
        username=username,
    )
    return db_user       # FastAPI filters this through UserResponse

def authenticate_user(
    db: Session,
    email: str,
    password: str,
    user_agent: str | None = None,
    ip_address: str | None = None,
    remember_me: bool = False,
) -> dict:
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

    # Create JWT tokens with user ID. Refresh tokens also carry a session id
    # when a real DB session is available, enabling multi-device sessions.
    # "Remember me" only changes how long the refresh session lives — the
    # remember flag travels inside the refresh JWT so rotation preserves it.
    session_id = str(uuid.uuid4())
    expire_days = _refresh_expire_days(remember_me)
    access_token = create_access_token({"sub": str(db_user.id)})
    refresh_token = create_refresh_token(
        {"sub": str(db_user.id), "sid": session_id, "remember": remember_me},
        expires_days=expire_days,
    )
    user_repo.update_refresh_token(db, db_user.id, hash_token(refresh_token))
    if db is not None:
        session_repo.create(
            db,
            session_id=session_id,
            user_id=db_user.id,
            refresh_token_hash=hash_token(refresh_token),
            expires_at=refresh_token_expires_at(expire_days),
            user_agent=user_agent,
            ip_address=ip_address,
        )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",  # tells the client how to send it (Authorization: Bearer ...)
        "remember_me": remember_me,
        "refresh_expires_in": expire_days * 24 * 60 * 60,
    }


def refresh_access_token(db: Session, refresh_token: str) -> dict:
    try:
        payload = verify_refresh_token(refresh_token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        session_id = payload.get("sid")
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from e

    db_user = user_repo.get_by_id(db, user_id=int(user_id))
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    active_session = None
    if session_id and db is not None:
        active_session = session_repo.get_active(db, session_id=str(session_id))
        if not active_session or active_session.user_id != db_user.id:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        if not verify_token_hash(refresh_token, active_session.refresh_token_hash):
            # Reuse detected: a stale (already-rotated) token was presented,
            # so treat the whole session as compromised.
            session_repo.revoke(db, session=active_session)
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    else:
        if not verify_token_hash(refresh_token, db_user.refresh_token):
            raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Rotation preserves the remember-me choice made at login (sliding window):
    # the flag rides in the refresh JWT, so each rotation extends the session
    # by the same duration the user originally chose.
    remember_me = bool(payload.get("remember", False))
    expire_days = _refresh_expire_days(remember_me)
    access_token = create_access_token({"sub": str(db_user.id)})
    next_session_id = str(session_id or uuid.uuid4())
    new_refresh_token = create_refresh_token(
        {"sub": str(db_user.id), "sid": next_session_id, "remember": remember_me},
        expires_days=expire_days,
    )
    user_repo.update_refresh_token(db, db_user.id, hash_token(new_refresh_token))
    if active_session is not None:
        session_repo.rotate(
            db,
            session=active_session,
            refresh_token_hash=hash_token(new_refresh_token),
            expires_at=refresh_token_expires_at(expire_days),
        )
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "remember_me": remember_me,
        "refresh_expires_in": expire_days * 24 * 60 * 60,
    }


def logout_refresh_token(db: Session, refresh_token: str) -> None:
    try:
        payload = verify_refresh_token(refresh_token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        session_id = payload.get("sid")
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from e

    db_user = user_repo.get_by_id(db, user_id=int(user_id))
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if session_id and db is not None:
        active_session = session_repo.get_active(db, session_id=str(session_id))
        if not active_session or active_session.user_id != db_user.id:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        if not verify_token_hash(refresh_token, active_session.refresh_token_hash):
            session_repo.revoke(db, session=active_session)
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        session_repo.revoke(db, session=active_session)
    else:
        if not verify_token_hash(refresh_token, db_user.refresh_token):
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_repo.update_refresh_token(db, db_user.id, None)
