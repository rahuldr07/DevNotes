"""add tags to notes

Revision ID: b71e4d2f9130
Revises: a3f1c9b2e047
Create Date: 2026-03-19 17:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b71e4d2f9130'
down_revision: Union[str, Sequence[str], None] = 'a3f1c9b2e047'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'notes',
        sa.Column(
            'tags',
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default=sa.text("'{}'::varchar[]"),
        ),
    )


def downgrade() -> None:
    op.drop_column('notes', 'tags')
