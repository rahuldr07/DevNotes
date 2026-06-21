# DevNotes

DevNotes is a full-stack developer knowledge platform for private notes, public writing, snippets, project docs, and AI-ready search. The current product combines a Next.js frontend, a FastAPI backend, and PostgreSQL storage, with a roadmap toward a premium developer knowledge cockpit.

## Product direction

DevNotes is evolving toward:

- A private developer knowledge base.
- Beautiful public developer profiles and shareable notes.
- Fast command/search driven workflows.
- Snippets, templates, and reusable project playbooks.
- AI semantic search and ask-your-notes workflows.
- Team workspaces and collaborative engineering docs.

See the roadmap docs:

- [`docs/DEVNOTES_1000X_ROADMAP.md`](docs/DEVNOTES_1000X_ROADMAP.md)
- [`docs/DEVNOTES_1000X_PRODUCT_UI_BLUEPRINT.md`](docs/DEVNOTES_1000X_PRODUCT_UI_BLUEPRINT.md)

## Tech stack

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/Radix UI
- TipTap editor
- Zustand

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- PostgreSQL
- Pytest

### Infrastructure

- Docker Compose for local PostgreSQL
- Next.js API route proxy as a backend-for-frontend layer

## Repository layout

```text
.
├── admin/                  # Next.js frontend
├── backend/                # FastAPI backend
├── compose.yaml            # Local PostgreSQL service
├── docs/                   # Product and architecture roadmaps
├── package.json            # Root script hub
└── readme.md
```

## Prerequisites

Install:

- Node.js 20+
- npm
- Python 3.11+
- Docker Desktop
- PostgreSQL client tools optional, but useful

## Environment setup

Create the backend environment file:

```powershell
Copy-Item backend/.env.example backend/.env
```

For local Docker PostgreSQL, the defaults in `backend/.env.example` match `compose.yaml`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=devnotes
DB_USER=devnotes
DB_PASSWORD=devnotes
DB_SSL_MODE=disable
```

For AWS RDS or another PostgreSQL instance, update the `DB_*` values in `backend/.env`.

## Install dependencies

Frontend:

```powershell
cd admin
npm install
cd ..
```

Backend:

```powershell
cd backend
python -m pip install -r requirements.txt
cd ..
```

## Local development

Start PostgreSQL:

```powershell
npm run dev:db
```

Run migrations:

```powershell
npm run db:migrate
```

Start backend API:

```powershell
npm run dev:backend
```

Start frontend in another terminal:

```powershell
npm run dev:frontend
```

Open:

```text
http://localhost:3000
```

Backend health checks:

```text
http://localhost:8000/health
http://localhost:8000/health/db
```

API docs:

```text
http://localhost:8000/docs
```

## Root scripts

```powershell
npm run dev:db        # Start local PostgreSQL
npm run dev:backend   # Start FastAPI dev server
npm run dev:frontend  # Start Next.js dev server
npm run db:migrate    # Apply Alembic migrations
npm run lint          # Run frontend Biome checks
npm run typecheck     # Run frontend TypeScript checks
npm run build         # Build frontend production bundle
npm run test:backend  # Run backend pytest suite
npm run test          # Run lint + typecheck + backend tests
```

## Validation status

Current baseline checks:

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:backend
```

Expected backend result at time of writing:

```text
21 passed
```

There may be dependency warnings from `slowapi` on newer Python versions. These are dependency-side warnings and not current application failures.

## Architecture overview

```text
Browser
  → Next.js app
  → /api/* route proxy
  → FastAPI backend
  → SQLAlchemy repositories/services
  → PostgreSQL
```

The frontend intentionally calls same-origin `/api/*` endpoints. The Next.js route handler forwards requests to FastAPI through `BACKEND_URL`, keeping the backend URL server-side.

Set a production backend URL in the frontend runtime environment:

```env
BACKEND_URL=https://api.example.com
```

## Database workflows

Start local PostgreSQL:

```powershell
docker compose up -d db
```

Apply migrations:

```powershell
cd backend
python -m alembic upgrade head
```

Create a database on an external PostgreSQL server:

```powershell
cd backend
python scripts/create_postgres_db.py
python -m alembic upgrade head
```

## Development priorities

Near-term implementation order:

1. Foundation hardening.
2. Cockpit UI shell and dashboard polish.
3. Public profile and public note polish.
4. HttpOnly cookie session flow.
5. PostgreSQL integration tests with Alembic migrations.
6. AI semantic search using embeddings and source citations.
7. Snippets and templates.
8. Workspaces and permissions.

## Security notes

Current auth uses browser-managed tokens. The planned production-grade direction is:

- Server-set HttpOnly secure cookies.
- Session table.
- Refresh token rotation.
- Multi-device session management.
- Refresh token reuse detection.

## Contributing workflow

Before committing:

```powershell
npm run lint
npm run typecheck
npm run build
npm run test:backend
```

Keep changes grouped by milestone and prefer small, validated commits.
