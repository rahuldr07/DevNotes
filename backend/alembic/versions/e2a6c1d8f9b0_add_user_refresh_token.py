"""Add user refresh token

Revision ID: e2a6c1d8f9b0
Revises: d1f7a9c8e2b4
Create Date: 2026-05-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e2a6c1d8f9b0"
down_revision: Union[str, Sequence[str], None] = "d1f7a9c8e2b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("refresh_token", sa.Text(), nullable=True))
    op.create_index(op.f("ix_users_refresh_token"), "users", ["refresh_token"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_users_refresh_token"), table_name="users")
    op.drop_column("users", "refresh_token")
