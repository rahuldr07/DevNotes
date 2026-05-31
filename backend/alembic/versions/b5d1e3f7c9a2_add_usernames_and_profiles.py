"""Add usernames and profiles

Revision ID: b5d1e3f7c9a2
Revises: a4c9e2f8b6d1
Create Date: 2026-05-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b5d1e3f7c9a2"
down_revision: Union[str, Sequence[str], None] = "a4c9e2f8b6d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("username", sa.String(length=30), nullable=True))
    op.execute(
        """
        WITH base AS (
            SELECT
                id,
                COALESCE(
                    NULLIF(
                        LEFT(
                            TRIM(BOTH '-' FROM REGEXP_REPLACE(
                                REGEXP_REPLACE(LOWER(name), '\\s+', '-', 'g'),
                                '[^a-z0-9-]',
                                '',
                                'g'
                            )),
                            30
                        ),
                        ''
                    ),
                    'user'
                ) AS slug
            FROM users
        ),
        ranked AS (
            SELECT
                id,
                slug,
                ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS duplicate_number
            FROM base
        )
        UPDATE users
        SET username = CASE
            WHEN ranked.duplicate_number = 1 THEN ranked.slug
            ELSE LEFT(
                ranked.slug,
                GREATEST(1, 30 - LENGTH('-' || users.id::text))
            ) || '-' || users.id::text
        END
        FROM ranked
        WHERE users.id = ranked.id
        """
    )
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_column("users", "username")
