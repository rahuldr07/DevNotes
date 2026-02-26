from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """
    users TABLE in PostgreSQL.

    Each line below = one COLUMN in the table.
    Think of it like defining a spreadsheet:
      id | name | email | hashed_password | role | created_at | updated_at
    """

    # This tells SQLAlchemy the actual table name in PostgreSQL
    __tablename__ = "users"

    # ── Columns ──

    # Primary key = unique ID for each row, auto-increments (1, 2, 3...)
    id = Column(Integer, primary_key=True, index=True)

    # User's display name. nullable=False = this column CANNOT be empty (SQL: NOT NULL)
    name = Column(String(255), nullable=False)

    # Email must be unique — no two users can register with the same email
    # index=True = PostgreSQL creates a fast-lookup index on this column
    email = Column(String(255), unique=True, nullable=False, index=True)

    # We NEVER store plain passwords. This holds the bcrypt hash.
    # Text = unlimited length (hashes are long strings)
    hashed_password = Column(Text, nullable=False)

    # Role for future authorization (admin vs regular user)
    # default="user" = if you don't specify a role, it defaults to "user"
    role = Column(String(50), nullable=False, default="user")

    # server_default=func.now() = PostgreSQL generates the timestamp,
    # not Python. This is more reliable (uses DB server's clock).
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # onupdate=func.now() = automatically updates whenever the row is modified
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())