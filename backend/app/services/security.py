from passlib.context import CryptContext

# CryptContext is a passlib utility that handles password hashing.
# schemes=["bcrypt"] — use the bcrypt algorithm (industry standard, very secure)
# deprecated="auto" — if we ever switch algorithms, old hashes still work
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Takes a plain text password like "abc123"
    Returns a hash like "$2b$12$LJ3m4ys..." (60 characters, irreversible)

    Used during REGISTRATION — we hash the password before saving to the database.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Takes what the user typed ("abc123") and the hash from the database.
    Returns True if they match, False otherwise.

    Used during LOGIN — we check if the typed password matches the stored hash.
    We NEVER decrypt the hash. bcrypt has a built-in way to compare.
    """
    return pwd_context.verify(plain_password, hashed_password)
