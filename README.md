# DevNotes

[![CI](https://github.com/rahuldr07/DevNotes/actions/workflows/ci.yml/badge.svg)](https://github.com/rahuldr07/DevNotes/actions/workflows/ci.yml)

**A developer knowledge cockpit.** Capture notes and snippets fast, retrieve them with ranked full-text search, and publish them as pages worth sharing — built with Next.js 16, FastAPI, and PostgreSQL.

```text
capture fast → reuse smarter → publish beautifully
```

## What it does

- **Quick capture** — save a note, snippet, link, or task from the dashboard in one submit.
- **Snippet vault** — code-first notes with language lanes, copy-ready blocks, and type/language metadata (`/dashboard/snippets`).
- **Ranked search** — PostgreSQL full-text search (`websearch_to_tsquery` + `ts_rank` over a generated `tsvector` column) behind a keyboard-first command palette (`Ctrl+K`), with type/tag/language filters.
- **Ask Workspace** — retrieval-first Q&A over your own notes: ask a question, get ranked source cards with highlighted excerpts (`/dashboard/ask`). Designed so LLM answer synthesis can sit on top and cite these exact sources.
- **Version history** — every edit snapshots the previous version (capped at 20 per note).
- **Publishing** — one click turns a private note into a public page with author card, reading time, related notes, and Open Graph metadata (`/s/<uuid>`), plus public developer profiles (`/u/<username>`).
- **Community** — explore feed with trending/recent sorting, likes, and view counts.
- **Six editor themes** — MonkeyType-inspired theme system driven by CSS variables.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router, React 19 + React Compiler), TypeScript, Tailwind CSS v4, shadcn/Radix, TipTap, Zustand, Biome |
| Backend | FastAPI, SQLAlchemy 2, Pydantic v2, Alembic, slowapi (rate limiting), pytest |
| Database | PostgreSQL 16 (full-text search, array columns, generated columns) |
| Infra | Docker Compose (local Postgres), GitHub Actions CI, Next.js BFF proxy |

## Architecture

```text
Browser
  └─ Next.js app (admin/)
      ├─ same-origin /api/* catch-all route  ←  BFF proxy
      │    · injects Authorization from the auth cookie
      │    · manages HttpOnly refresh cookie
      │    · backend URL never reaches the client
      └─ server components (/s, /u) fetch FastAPI directly
            └─ FastAPI (backend/)
                 routers → services → repositories → models
                 └─ PostgreSQL (SQLAlchemy pool tuned for Aurora)
```

## Design decisions

**BFF proxy instead of direct API calls.** The browser only ever talks to same-origin `/api/*`. A catch-all Next.js route handler (`admin/src/app/api/[...path]/route.ts`) strips hop-by-hop headers, re-attaches `Authorization` from the auth cookie, and forwards to FastAPI via a server-side `BACKEND_URL`. No CORS surface in production, no backend URL in client bundles.

**Session-backed refresh token rotation with reuse detection.** Access tokens are short-lived (30 min) stateless JWTs. Refresh tokens (7 days) live in an HttpOnly cookie, are rotated on every refresh, and are backed by a `user_sessions` table storing a bcrypt hash per device. Presenting a stale refresh token (hash mismatch) revokes the session — the classic token-theft defense.

**Full-text search in the database, not a search service.** `notes.search_vector` is a stored generated `TSVECTOR` column, so indexing is free and always consistent. Queries use `websearch_to_tsquery` + `ts_rank`. A lexical fallback ranker (title/tags weighted over body, phrase boosts) keeps search working on non-Postgres dev databases and doubles as a stepping stone toward hybrid semantic ranking.

**Cursor pagination everywhere.** List endpoints paginate on `id < cursor` rather than offset, so pages stay stable while new notes are created.

**Version snapshots on write.** Updating a note snapshots the previous state into `note_versions` first, trimmed to the latest 20 — history without unbounded growth.

**Rate limiting at the edge of the API.** slowapi with per-route budgets (register 5/min, login 10/min, create/search 30/min) on top of a 60/min default.

## Getting started

Prerequisites: Node.js 20+, Python 3.11+, Docker Desktop.

```powershell
# 1. Environment (defaults match the local Docker Postgres)
Copy-Item backend/.env.example backend/.env

# 2. Install
cd admin; npm install; cd ..
cd backend; python -m pip install -r requirements.txt; cd ..

# 3. Database
npm run dev:db        # start Postgres 16 in Docker
npm run db:migrate    # apply Alembic migrations

# 4. Run (two terminals)
npm run dev:backend   # FastAPI on :8000  (docs at /docs)
npm run dev:frontend  # Next.js on :3000
```

Backend health checks: `http://localhost:8000/health` and `/health/db`.

For a non-Docker PostgreSQL (RDS, Neon, etc.), update `DB_*` in `backend/.env`; `backend/scripts/create_postgres_db.py` bootstraps the role and database. The frontend reads `BACKEND_URL` from its server environment in production.

## Scripts and validation

```powershell
npm run lint          # frontend Biome checks
npm run typecheck     # frontend TypeScript checks
npm run build         # frontend production build
npm run test:backend  # backend pytest suite (no live DB required)
npm run test          # lint + typecheck + backend tests
```

CI runs the backend suite and frontend lint/typecheck/build on every push and pull request (`.github/workflows/ci.yml`). The backend tests override `get_db`/`get_current_user`, so they run without a database.

## Repository layout

```text
.
├── admin/                  # Next.js frontend (App Router)
│   └── src/
│       ├── app/            # routes: landing, auth, dashboard, ask, public pages
│       ├── components/     # editor, palette, capture, share, theme system
│       └── lib/            # API client, BFF backend resolver, note API
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── routers/        # auth, notes, profiles
│   │   ├── services/       # business logic (auth sessions, notes, profiles)
│   │   ├── repositories/   # data access (users, notes, sessions)
│   │   ├── models/         # SQLAlchemy ORM tables
│   │   └── schemas/        # Pydantic request/response models
│   ├── alembic/            # migrations
│   └── tests/              # pytest suite
├── compose.yaml            # local PostgreSQL 16
├── docs/                   # product roadmap and UI blueprint
└── package.json            # root script hub
```

## Roadmap

1. LLM answer synthesis on the Ask Workspace page — answers must cite source notes.
2. Semantic search: pgvector embeddings with hybrid (lexical + vector) ranking.
3. MCP server so coding agents can search and save workspace notes.
4. Reuse analytics (`knowledge_events`) to surface most-reused knowledge.
5. Password reset and email verification (deliberately scoped out pre-deploy).

See [`docs/DEVNOTES_1000X_PRODUCT_UI_BLUEPRINT.md`](docs/DEVNOTES_1000X_PRODUCT_UI_BLUEPRINT.md) for the long-form product blueprint.

## Contributing workflow

Before committing: `npm run test` (lint + typecheck + backend tests) and `npm run build`. Keep changes grouped by milestone and prefer small, validated commits.
