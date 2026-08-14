"""Index the columns search actually filters on, and put tags in the vector

Three gaps this closes:

* `notes.tags` had no GIN index, but tag-filtered search runs
  `tags @> ARRAY[...]` — a sequential scan on every query.
* The community feed filters `is_community AND is_published` ordered by id,
  with no supporting index.
* `search_vector` covered title and content only, so a note tagged `docker`
  could not be found by searching for "docker" unless the word also appeared
  in its prose. Generated-column expressions cannot be altered in place, so
  the column is dropped and recreated.

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-14 13:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# array_to_string and to_tsvector(regconfig, text) are both IMMUTABLE, which
# a stored generated column requires. coalesce guards against a NULL member
# turning the whole expression — and therefore the whole vector — into NULL.
SEARCH_EXPRESSION = (
    "to_tsvector('english', "
    "coalesce(title, '') || ' ' || "
    "coalesce(content, '') || ' ' || "
    "coalesce(array_to_string(tags, ' '), ''))"
)

LEGACY_EXPRESSION = "to_tsvector('english', title || ' ' || content)"


def _rebuild_search_vector(expression: str) -> None:
    op.drop_index("ix_notes_search_vector", table_name="notes", postgresql_using="gin")
    op.drop_column("notes", "search_vector")
    op.add_column(
        "notes",
        sa.Column(
            "search_vector",
            postgresql.TSVECTOR(),
            sa.Computed(expression, persisted=True),
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


def upgrade() -> None:
    op.create_index(
        "ix_notes_tags",
        "notes",
        ["tags"],
        unique=False,
        postgresql_using="gin",
    )
    op.create_index(
        "ix_notes_community_feed",
        "notes",
        ["is_community", "is_published", "id"],
        unique=False,
    )
    _rebuild_search_vector(SEARCH_EXPRESSION)


def downgrade() -> None:
    _rebuild_search_vector(LEGACY_EXPRESSION)
    op.drop_index("ix_notes_community_feed", table_name="notes")
    op.drop_index("ix_notes_tags", table_name="notes", postgresql_using="gin")
