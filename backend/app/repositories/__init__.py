# Repositories package — Database access layer (DAL).
# Each file contains SQLAlchemy queries for one table.
# Repositories do NOT contain business logic — that belongs in services.
# Pattern: db.query(Model).filter(...).first() / .all()