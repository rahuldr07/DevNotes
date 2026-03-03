# Schemas package — Pydantic models for request/response validation.
# Separate from SQLAlchemy models (app/models/) to control what
# data goes IN (Create/Update schemas) and what comes OUT (Response schemas).
# This prevents exposing sensitive fields like hashed_password.