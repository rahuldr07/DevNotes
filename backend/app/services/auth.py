from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from app.config import get_settings


def create_access_token(data: dict) -> str:
    """
    Creates a JWT access token with an expiration time.

    Args:
        data: A dictionary of claims to include in the token.

    Returns:
        A signed JWT as a string.
    """
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str) -> dict:
    """
    Verifies a JWT access token and returns the decoded claims.

    Args:
        token: The JWT token string to verify.

    Returns:
        The decoded claims as a dictionary if the token is valid.
    Raises:
        JWTError: If the token is invalid or expired.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise JWTError("Invalid or expired token") from e