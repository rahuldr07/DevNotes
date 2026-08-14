"""Unique version numbers per note

Version numbers are assigned as "max + 1", so two concurrent edits to the same
note can both read the same max and write duplicate version numbers. The
constraint turns that race into an IntegrityError the update service retries.

Existing duplicates are renumbered first, oldest row keeping the lower number,
so the constraint can be added without failing on historical data.

Revision ID: a1b2c3d4e5f6
Revises: d8e5f2a9b1c3
Create Date: 2026-08-14 12:40:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "d8e5f2a9b1c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        WITH renumbered AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY note_id
                    ORDER BY version_number, created_at, id
                ) AS next_number
            FROM note_versions
        )
        UPDATE note_versions AS nv
        SET version_number = renumbered.next_number
        FROM renumbered
        WHERE nv.id = renumbered.id
          AND nv.version_number IS DISTINCT FROM renumbered.next_number
        """
    )
    op.create_unique_constraint(
        "uq_note_versions_note_id_version_number",
        "note_versions",
        ["note_id", "version_number"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_note_versions_note_id_version_number",
        "note_versions",
        type_="unique",
    )
