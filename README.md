# DevNotes

[![CI](https://github.com/rahuldr07/DevNotes/actions/workflows/ci.yml/badge.svg)](https://github.com/rahuldr07/DevNotes/actions/workflows/ci.yml)

**A developer knowledge cockpit.** Capture notes and snippets fast, retrieve them with ranked full-text search, and publish them as pages worth sharing — built with Next.js 16, FastAPI, and PostgreSQL.

```text
capture fast → reuse smarter → publish beautifully
```

## What it does

- **Quick capture** — save a note or a snippet from the dashboard in one submit, with `/note` and `/snippet` prefixes and one-click templates.
- **Snippet vault** — code-first notes with language lanes, copy-ready blocks, and type/language metadata (`/dashboard/snippets`).
- **Ranked search** — PostgreSQL full-text search (`websearch_to_tsquery` + `ts_rank` over a generated `tsvector` column) behind a keyboard-first command palette (`Ctrl+K`), with type/tag/language filters.
- **Ask Workspace** — retrieval-first Q&A over your own notes: ask a question, get ranked source cards with highlighted excerpts (`/dashboard/ask`). Designed so LLM answer synthesis can sit on top and cite these exact sources.
- **Version history** — every edit snapshots the previous version (capped at 20 per note).
- **Publishing** — publishing mints a share link (`/s/<uuid>`) and nothing more; listing is a separate switch that adds the note to your public profile (`/u/<username>`) and to related-reading rails. Public pages carry an author card, reading time, related notes and Open Graph metadata.
- **Community** — explore feed with trending/recent sorting, likes, and view counts.
- **24 editor themes** — MonkeyType-inspired theme system driven by CSS variables, with colorway, typeface and corner radius as independent dials.

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

**Session-backed refresh token rotation with reuse detection.** Access tokens are short-lived (30 min) stateless JWTs carrying an explicit `token_type`, so a refresh token cannot be presented as a bearer credential. Refresh tokens (7 days, 30 with remember-me) live in an HttpOnly cookie, are rotated on every refresh, and are backed by a `user_sessions` table storing a SHA-256 digest per device — bcrypt truncates at 72 bytes, which two JWTs for the same session share, silently defeating reuse detection. Presenting a stale refresh token (digest mismatch) revokes the session.

**Full-text search in the database, not a search service.** `notes.search_vector` is a stored generated `TSVECTOR` column covering title, tags and body with `setweight` field weights (A/B/C), so a title hit outranks a passing mention and a note is findable by its tags. Queries use `websearch_to_tsquery` + `ts_rank`. A lexical fallback ranker keeps search working on non-Postgres dev databases and doubles as a stepping stone toward hybrid semantic ranking.

**Pagination matched to the ordering.** The recency-ordered feeds paginate on `id < cursor`, so pages stay stable while new notes are created. Relevance-ordered and user-sorted lists (search, the notes library) paginate by offset instead: rank does not track id, and an id cursor over a ranked list drops and repeats rows between pages.

**Version snapshots on write.** Updating a note snapshots the previous state into `note_versions` first, trimmed to the latest 20 — history without unbounded growth.

**Rate limiting keyed on the caller, not the proxy.** Every request reaches FastAPI through the BFF, so limits keyed on the peer address would put the entire user base in one bucket. Authenticated routes key on the verified JWT subject; anonymous ones fall back to the peer address (or a forwarded one, when `TRUST_FORWARDED_FOR` says a trusted proxy is the sole ingress). Credential stuffing is handled per account by a failure throttle rather than per IP.

## Getting started

Prerequisites: Node.js 20+, Python 3.11+, Docker Desktop.

The whole stack in one command:

```powershell
npm run stack:up      # db + migrations + API + web on http://localhost:3000
npm run stack:down
```

Or run it locally with hot reload:

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
npm run dev:backend   # FastAPI on :8000  (docs at /docs in development)
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

CI runs the backend suite and frontend lint/typecheck/build on every push and pull request (`.github/workflows/ci.yml`).

The backend suite has two halves. Unit tests override `get_db`/`get_current_user` and run without a database. `tests/integration/` runs against a real PostgreSQL: it applies every migration (down to base and back up), then exercises the Postgres-only paths — the generated `tsvector` and its ranking, GIN tag containment, `unnest` aggregates, the unique constraints, and the pagination SQL. Locally that package skips when no database is reachable; CI provides one and sets `REQUIRE_INTEGRATION_DB=1` so a skip fails the build instead of passing quietly.

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
5. Password reset and email verification — needs an email provider decision (SMTP/Resend/SES) before it can be built.
6. Redis-backed rate limiting and login throttling, so both are shared across workers rather than per process.

See [`docs/DEVNOTES_1000X_PRODUCT_UI_BLUEPRINT.md`](docs/DEVNOTES_1000X_PRODUCT_UI_BLUEPRINT.md) for the long-form product blueprint.

## Contributing workflow

Before committing: `npm run test` (lint + typecheck + backend tests) and `npm run build`. Keep changes grouped by milestone and prefer small, validated commits.
