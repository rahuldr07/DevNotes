# Copilot Instructions for DevNotes

## Project Overview

DevNotes is a full-stack note-taking application with:
- **Backend**: FastAPI application (`/backend`) connected to AWS Aurora PostgreSQL
- **Admin/Frontend**: Next.js 16 application (`/admin`) with React 19 and Tailwind CSS v4

## Build, Test, and Lint Commands

### Frontend (admin/)

```bash
# Development server (runs on http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code with Biome
npm run lint

# Format code with Biome
npm run format
```

### Backend (backend/)

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server (requires .env file with DB credentials)
uvicorn app.main:app --reload

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

No test suite is currently configured.

## Architecture

### Backend Structure

The backend follows a layered architecture:

- **`app/main.py`**: FastAPI app setup with lifespan management for DB connection pooling
- **`app/routers/`**: Route handlers organized by resource (e.g., `notes.py`)
- **`models/`**: SQLAlchemy ORM models (database tables)
- **`schemas/`**: Pydantic models for request/response validation
- **`database.py`**: SQLAlchemy engine and session configuration with Aurora-specific pool settings
- **`config.py`**: Centralized settings using Pydantic Settings (loads from `.env`)
- **`dependencies.py`**: Dependency injection functions (e.g., `get_db()` for DB sessions)
- **`alembic/`**: Database migration files

**Database Connection Pattern**: 
- The engine maintains a connection pool (10 base + 20 overflow = 30 max connections)
- Pool recycles connections after 30 minutes to handle Aurora's idle connection timeouts
- Use the `get_db()` dependency in routes to get auto-managed sessions

### Frontend Structure

Standard Next.js 16 App Router structure:

- **`src/app/`**: App router pages and layouts
- **`src/app/layout.tsx`**: Root layout with global styles
- **`src/app/page.tsx`**: Home page
- **React Compiler**: Enabled in `next.config.ts` for automatic optimizations

## Key Conventions

### Backend

1. **Config Management**: All environment variables are defined in `config.py` as a Pydantic `Settings` class. Never hardcode credentials or connection strings.

2. **Database Sessions**: Always use the `get_db()` dependency for database access in routes:
   ```python
   from dependencies import get_db
   from sqlalchemy.orm import Session
   
   @router.get("/endpoint")
   def route(db: Session = Depends(get_db)):
       # db session is automatically managed
   ```

3. **Startup Health Check**: The app tests Aurora connectivity on startup and fails fast if unreachable. Check VPC/security groups and credentials if startup fails.

4. **Comments**: Code includes educational comments explaining Aurora-specific tuning and design decisions (e.g., pool settings, connection recycling).

### Frontend

1. **Formatting**: Uses Biome with 2-space indentation. Biome handles both linting and formatting.

2. **Biome Rules**: 
   - Next.js and React recommended rules are enabled
   - `noUnknownAtRules` is disabled (for Tailwind CSS compatibility)
   - Auto-organize imports on save

3. **Tailwind CSS**: Uses Tailwind CSS v4 (PostCSS-based, not JIT from v3)

## Environment Setup

### Backend `.env` Required Variables

```
DB_HOST=your-aurora-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=devnotes
DB_USER=postgres
DB_PASSWORD=your-password
DB_SSL_MODE=require
```

Optional pool tuning variables (have defaults):
- `DB_POOL_SIZE` (default: 10)
- `DB_MAX_OVERFLOW` (default: 20)
- `DB_POOL_TIMEOUT` (default: 30)
- `DB_POOL_RECYCLE` (default: 1800)
