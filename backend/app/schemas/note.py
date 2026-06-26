from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validate_tags(value: list[str] | None) -> list[str] | None:
    if value is None:
        return value
    if len(value) > 10:
        raise ValueError("Tags must contain at most 10 items")
    for tag in value:
        if len(tag) > 30:
            raise ValueError("Each tag must be at most 30 characters")
    return value


ALLOWED_NOTE_TYPES = {"note", "snippet", "guide", "checklist"}


def _validate_note_type(value: str | None) -> str | None:
    if value is None:
        return value
    cleaned = value.strip().lower()
    if cleaned not in ALLOWED_NOTE_TYPES:
        raise ValueError("Invalid note type")
    return cleaned


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., max_length=100000)
    tags: list[str] = Field(default_factory=list, max_length=10)
    note_type: str = Field(default="note", max_length=32)
    language: str | None = Field(default=None, max_length=64)
    source_url: str | None = Field(default=None, max_length=500)

    @field_validator("tags")
    @classmethod
    def tags_must_be_limited(cls, value: list[str]) -> list[str]:
        return _validate_tags(value) or []

    @field_validator("note_type")
    @classmethod
    def note_type_must_be_known(cls, value: str) -> str:
        return _validate_note_type(value) or "note"


class NoteResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    note_type: str = "note"
    language: str | None = None
    source_url: str | None = None
    is_pinned: bool = False
    share_uuid: str | None = None
    is_published: bool = False
    is_community: bool = False
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class CommunityNoteResponse(BaseModel):
    id: int
    author_name: str
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    note_type: str = "note"
    language: str | None = None
    source_url: str | None = None
    is_pinned: bool = False
    share_uuid: str | None = None
    is_published: bool = False
    is_community: bool = False
    like_count: int = 0
    view_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PublicNoteResponse(BaseModel):
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    note_type: str = "note"
    language: str | None = None
    source_url: str | None = None
    share_uuid: str
    is_published: bool = False
    is_community: bool = False
    like_count: int = 0
    view_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RelatedPublicNoteResponse(BaseModel):
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    note_type: str = "note"
    language: str | None = None
    source_url: str | None = None
    share_uuid: str
    is_published: bool = False
    is_community: bool = False
    like_count: int = 0
    view_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedNoteResponse(BaseModel):
    data: list[NoteResponse]
    next_cursor: int | None = None


class PaginatedCommunityNoteResponse(BaseModel):
    data: list[CommunityNoteResponse]
    next_cursor: int | None = None


class NoteVersionSummaryResponse(BaseModel):
    id: int
    version_number: int
    title: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NoteVersionResponse(BaseModel):
    id: int
    note_id: int
    version_number: int
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LikeToggleResponse(BaseModel):
    liked: bool
    like_count: int


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, max_length=100000)
    tags: list[str] | None = Field(default=None, max_length=10)
    note_type: str | None = Field(default=None, max_length=32)
    language: str | None = Field(default=None, max_length=64)
    source_url: str | None = Field(default=None, max_length=500)
    is_published: bool | None = None
    is_community: bool | None = None

    @field_validator("tags")
    @classmethod
    def tags_must_be_limited(cls, value: list[str] | None) -> list[str] | None:
        return _validate_tags(value)

    @field_validator("note_type")
    @classmethod
    def note_type_must_be_known(cls, value: str | None) -> str | None:
        return _validate_note_type(value)
