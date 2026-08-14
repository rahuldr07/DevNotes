from datetime import datetime

from pydantic import BaseModel, Field


class PublicProfileNoteResponse(BaseModel):
    """A profile card. The body stays behind the note's own page — a profile
    with fifty long notes should not ship all fifty bodies to render
    two-line previews."""

    id: int
    title: str
    preview: str = ""
    reading_minutes: int = 1
    share_uuid: str
    tags: list[str] = Field(default_factory=list)
    note_type: str = "note"
    language: str | None = None
    source_url: str | None = None
    like_count: int = 0
    view_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None


class PublicProfileResponse(BaseModel):
    username: str
    name: str
    bio: str | None = None
    website_url: str | None = None
    github_url: str | None = None
    twitter_url: str | None = None
    avatar_url: str | None = None
    created_at: datetime
    public_notes: list[PublicProfileNoteResponse] = Field(default_factory=list)
