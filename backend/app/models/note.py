from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from app.database import Base


class Note(Base):
    """
    This Python class = the "notes" table in Aurora PostgreSQL.
    
    When you run migrations, Alembic reads this class and creates:
    
    CREATE TABLE notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE,
        foreign key (user_id) references users(id)
    );
    """
    __tablename__ = "notes"    # ← Actual table name in the database

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    tags = Column(ARRAY(String), default=list, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    # Sharing features
    share_uuid = Column(String(36), unique=True, nullable=True, index=True)
    is_published = Column(Boolean, default=False, nullable=False)
    is_community = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
