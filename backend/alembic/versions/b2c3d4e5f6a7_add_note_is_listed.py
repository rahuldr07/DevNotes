"""Separate "published" from "listed"

Until now `is_published` did double duty: it minted the share link *and* put
the note on the author's public profile and into the cross-author "related
reading" rail — while the share dialog told the user only that "anyone with
the URL can read this note". Publishing is now just the link; listing is the
separate opt-in to be discoverable.

Backfill sets `is_listed = is_published`, so no note that is currently visible
on a profile disappears from it. The difference is that the state is now
visible and switchable in the share dialog, and newly published notes start
unlisted.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-14 12:55:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notes",
        sa.Column(
            "is_listed",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.execute("UPDATE notes SET is_listed = is_published")
    op.create_index(
        "ix_notes_public_listed",
        "notes",
        ["is_published", "is_listed", "id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notes_public_listed", table_name="notes")
    op.drop_column("notes", "is_listed")
