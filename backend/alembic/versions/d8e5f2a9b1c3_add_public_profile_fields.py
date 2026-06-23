"""add public profile fields

Revision ID: d8e5f2a9b1c3
Revises: c9d4e1f7a2b8
Create Date: 2026-06-23 10:47:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d8e5f2a9b1c3"
down_revision: Union[str, Sequence[str], None] = "c9d4e1f7a2b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("website_url", sa.String(length=500), nullable=True))
    op.add_column("users", sa.Column("github_url", sa.String(length=500), nullable=True))
    op.add_column("users", sa.Column("twitter_url", sa.String(length=500), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "twitter_url")
    op.drop_column("users", "github_url")
    op.drop_column("users", "website_url")
    op.drop_column("users", "bio")
