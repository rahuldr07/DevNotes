from datetime import datetime

import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


USERNAME_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$")


def _validate_password(value: str) -> str:
    if not any(char.isalpha() for char in value):
        raise ValueError("Password must contain at least one letter")
    if not any(char.isdigit() for char in value):
        raise ValueError("Password must contain at least one number")
    return value


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, value: str) -> str:
        return _validate_password(value)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    remember_me: bool = False

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, value: str) -> str:
        return _validate_password(value)


class RefreshTokenRequest(BaseModel):
    refresh_token: str | None = Field(default=None, min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    # Lets cookie-setting layers (FastAPI + the Next.js BFF proxy) size the
    # refresh cookie without re-decoding the JWT.
    remember_me: bool = False
    refresh_expires_in: int = 7 * 24 * 60 * 60


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class CurrentUserResponse(BaseModel):
    id: int
    name: str
    email: str
    username: str | None = None
    bio: str | None = None
    website_url: str | None = None
    github_url: str | None = None
    twitter_url: str | None = None
    avatar_url: str | None = None
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    username: str | None = Field(default=None, min_length=3, max_length=30)
    bio: str | None = Field(default=None, max_length=280)
    website_url: str | None = Field(default=None, max_length=500)
    github_url: str | None = Field(default=None, max_length=500)
    twitter_url: str | None = Field(default=None, max_length=500)
    avatar_url: str | None = Field(default=None, max_length=500)

    @field_validator("username")
    @classmethod
    def username_must_be_slug(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip().lower()
        if not USERNAME_RE.fullmatch(cleaned):
            raise ValueError(
                "Username must be 3-30 characters using lowercase letters, numbers, and single hyphens"
            )
        return cleaned

    @field_validator("bio", "website_url", "github_url", "twitter_url", "avatar_url")
    @classmethod
    def blank_strings_become_none(cls, value: str | None) -> str | None:
        if value is None:
            return value
        cleaned = value.strip()
        return cleaned or None
