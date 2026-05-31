"""Add note search vector

Revision ID: d1f7a9c8e2b4
Revises: c46c892396fd
Create Date: 2026-05-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "d1f7a9c8e2b4"
down_revision: Union[str, Sequence[str], None] = "c46c892396fd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "notes",
        sa.Column(
            "search_vector",
            postgresql.TSVECTOR(),
            sa.Computed(
                "to_tsvector('english', title || ' ' || content)",
                persisted=True,
            ),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_notes_search_vector",
        "notes",
        ["search_vector"],
        unique=False,
        postgresql_using="gin",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_notes_search_vector", table_name="notes", postgresql_using="gin")
    op.drop_column("notes", "search_vector")
