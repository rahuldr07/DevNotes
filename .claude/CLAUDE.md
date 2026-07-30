# DevNotes

Full-stack developer knowledge platform: notes, snippets, public publishing.

## Stack
- **Frontend** `admin/`: Next.js 16 (webpack dev), React 19, TypeScript, Tailwind v4, TipTap editor, zustand, Biome (lint+format). npm.
- **Backend** `backend/`: FastAPI, SQLAlchemy, Alembic, PostgreSQL (localhost:5432), pytest.
- Browser → Next `/api/*` proxy (`admin/src/app/api/[...path]/route.ts`) → FastAPI at localhost:8000. Auth = HttpOnly cookies, proxy is the single cookie writer.

## Commands (from repo root)
- Frontend dev: `npm run dev:frontend` (port 3000)
- Backend dev: `npm run dev:backend` (port 8000)
- Lint: `npm run lint` · Typecheck: `npm run typecheck` · Build: `npm run build`
- Backend tests: `npm run test:backend` (or `cd backend && python -m pytest -q`)

## Conventions
- Commits: short lowercase-hyphenated messages (`fix-x-and-y`), author rahuldr07, **no AI/co-author attribution**. Commit feature-by-feature; push only when asked.
- UI copy skews lowercase; `rounded-none` everywhere (globals.css re-points it to the theme radius); colors via CSS variable aliases (`--bg`, `--text-primary`, `--accent`), never raw hex.
- Shared helpers live in `admin/src/lib/` (format.ts, notes.ts, errors.ts, clipboard.ts); all HTTP goes through `lib/note-api.ts` / `lib/auth-api.ts`.
- `_handoff/` at repo root is intentionally untracked — never commit it.
- Themes: registry in `admin/src/lib/themes.ts`, applied via `data-theme` attribute + blocking init script in `app/layout.tsx`.
