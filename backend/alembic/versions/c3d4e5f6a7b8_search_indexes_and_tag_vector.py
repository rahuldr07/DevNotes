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

The vector goes through a wrapper function because PostgreSQL requires a
stored generated column to be IMMUTABLE, and `array_to_string` is only
STABLE — its result depends on the element type's output function. Pinning
the argument to `text[]` makes the result deterministic in practice, which is
the standard workaround; the cost is that changing this function later needs
a migration that rebuilds the column, exactly as this one does.

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


# Fields are weighted rather than concatenated into one flat vector. Without
# setweight, ts_rank scores a title hit exactly the same as a passing mention
# in the body — the fallback ranker in note_repo has always weighted title
# above tags above body, and the Postgres path (the one that actually runs)
# was the blunter of the two. ts_rank's default weights are
# {D, C, B, A} = {0.1, 0.2, 0.4, 1.0}.
SEARCH_FUNCTION = """
CREATE OR REPLACE FUNCTION devnotes_note_search_vector(
    title text,
    content text,
    tags text[]
)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(
            to_tsvector('english', coalesce(array_to_string(tags, ' '), '')),
            'B'
        ) ||
        setweight(to_tsvector('english', coalesce(content, '')), 'C')
$$;
"""

SEARCH_EXPRESSION = "devnotes_note_search_vector(title, content, tags::text[])"
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
    op.execute(SEARCH_FUNCTION)
    _rebuild_search_vector(SEARCH_EXPRESSION)


def downgrade() -> None:
    _rebuild_search_vector(LEGACY_EXPRESSION)
    op.execute("DROP FUNCTION IF EXISTS devnotes_note_search_vector(text, text, text[])")
    op.drop_index("ix_notes_community_feed", table_name="notes")
    op.drop_index("ix_notes_tags", table_name="notes", postgresql_using="gin")
