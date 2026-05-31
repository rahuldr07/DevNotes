from datetime import datetime

from pydantic import BaseModel, Field


class PublicProfileNoteResponse(BaseModel):
    title: str
    share_uuid: str
    tags: list[str] = Field(default_factory=list)
    like_count: int = 0
    view_count: int = 0
    created_at: datetime


class PublicProfileResponse(BaseModel):
    username: str
    name: str
    created_at: datetime
    public_notes: list[PublicProfileNoteResponse] = Field(default_factory=list)
