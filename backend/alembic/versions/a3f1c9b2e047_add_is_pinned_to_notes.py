"""add is_pinned to notes

Revision ID: a3f1c9b2e047
Revises: 780be352d143
Create Date: 2026-03-09 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f1c9b2e047'
down_revision: Union[str, Sequence[str], None] = '780be352d143'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('notes', sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    op.drop_column('notes', 'is_pinned')
