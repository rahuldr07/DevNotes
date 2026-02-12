from pydantic import BaseModel
from datetime import datetime


class UserCreate(BaseModel):
    """
    What the client sends when CREATING a user.
    Only name, email, and password — the server handles id, role, timestamps, etc.
    
    Example request body:
    {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "password": "securepassword123"
    }
    """
    name: str
    email: str
    password: str

class UserResponse(BaseModel):
    """
    What the API sends BACK to the client.
    Includes everything including server-generated fields.
    
    Example response:
    {
        "id": 1,
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "user",
        "created_at": "2026-02-06T10:30:00Z",
        "updated_at": null
    }
    """
    id: int
    name: str
    email: str
    role: str
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True   # Allows SQLAlchemy model → Pydantic schema conversion