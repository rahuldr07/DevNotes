# DevNotes Backend — FastAPI application package.
#
# Architecture layers (top → bottom):
#   routers/       → API endpoints (HTTP handling)
#   schemas/       → Request/response validation (Pydantic)
#   services/      → Business logic (auth, notes)
#   repositories/  → Database queries (SQLAlchemy)
#   models/        → ORM table definitions
#   database.py    → Engine + session configuration
#   config.py      → Environment variable management
#   dependencies.py → Dependency injection (DB session, auth)