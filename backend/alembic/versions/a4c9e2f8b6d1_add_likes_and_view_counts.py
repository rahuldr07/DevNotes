"""Add likes and view counts

Revision ID: a4c9e2f8b6d1
Revises: f3b7d2e9a1c4
Create Date: 2026-05-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a4c9e2f8b6d1"
down_revision: Union[str, Sequence[str], None] = "f3b7d2e9a1c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "notes",
        sa.Column("view_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_table(
        "note_likes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("note_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("note_id", "user_id", name="uq_note_likes_note_id_user_id"),
    )
    op.create_index(op.f("ix_note_likes_id"), "note_likes", ["id"], unique=False)
    op.create_index(op.f("ix_note_likes_note_id"), "note_likes", ["note_id"], unique=False)
    op.create_index(op.f("ix_note_likes_user_id"), "note_likes", ["user_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_note_likes_user_id"), table_name="note_likes")
    op.drop_index(op.f("ix_note_likes_note_id"), table_name="note_likes")
    op.drop_index(op.f("ix_note_likes_id"), table_name="note_likes")
    op.drop_table("note_likes")
    op.drop_column("notes", "view_count")
