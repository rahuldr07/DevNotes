"""add note snippet metadata

Revision ID: c9d4e1f7a2b8
Revises: f8a1c2d4e6b7
Create Date: 2026-06-23 09:33:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9d4e1f7a2b8"
down_revision: Union[str, Sequence[str], None] = "f8a1c2d4e6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notes",
        sa.Column("note_type", sa.String(length=32), server_default="note", nullable=False),
    )
    op.add_column("notes", sa.Column("language", sa.String(length=64), nullable=True))
    op.add_column("notes", sa.Column("source_url", sa.String(length=500), nullable=True))
    op.create_index(op.f("ix_notes_note_type"), "notes", ["note_type"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notes_note_type"), table_name="notes")
    op.drop_column("notes", "source_url")
    op.drop_column("notes", "language")
    op.drop_column("notes", "note_type")
