from pydantic import BaseModel
from datetime import datetime


class NoteCreate(BaseModel):
    """
    What the client sends when CREATING a note.
    Only title and content — the server handles id, timestamps, etc.
    
    Example request body:
    {
        "title": "My First Note",
        "content": "Hello from Aurora!"
    }
    """
    title: str
    content: str


class NoteResponse(BaseModel):
    """
    What the API sends BACK to the client.
    Includes everything including server-generated fields.
    
    Example response:
    {
        "id": 1,
        "title": "My First Note",
        "content": "Hello from Aurora!",
        "created_at": "2026-02-06T10:30:00Z",
        "updated_at": null
    }
    """
    id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True   # Allows SQLAlchemy model → Pydantic schema conversion