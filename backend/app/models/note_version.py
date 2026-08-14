from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func

from app.database import Base


class NoteVersion(Base):
    __tablename__ = "note_versions"
    __table_args__ = (
        # Version numbers come from "max + 1", so two concurrent edits to the
        # same note would otherwise both land on the same number. The unique
        # constraint turns that race into an IntegrityError, which the update
        # service retries against a freshly read max.
        UniqueConstraint(
            "note_id", "version_number", name="uq_note_versions_note_id_version_number"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(ARRAY(String), default=list, nullable=False)
    version_number = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
