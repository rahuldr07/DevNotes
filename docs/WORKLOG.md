# DevNotes Worklog — shipped state, active plan, backlog

> Living document. Complements the vision docs (`DEVNOTES_1000X_ROADMAP.md`, `DEVNOTES_1000X_PRODUCT_UI_BLUEPRINT.md`) with what is actually shipped, what is in flight, and what is queued. Update this when a slice lands.

Last updated: 2026-07-18

---

## 1. Shipped (July 2026 quality/design push)

Each bullet is one pushed commit slice on `master`.

### Correctness and UX fixes
- **fix-validation-500-and-surface-field-errors** — backend 422 handler no longer 500s on Pydantic v2 `ctx`; API client surfaces field-level messages ("Email: not a valid address") instead of generic "Validation failed".
- **feat-community-liked-state-and-author-links** — `/notes/community` returns `author_username` + viewer-aware `liked_by_me` (single query via `bool_or`); Explore hearts pre-fill and author links render.
- **fix-note-version-snapshots-and-single-transaction** — publish/community toggles no longer burn version slots; snapshot + trim commit atomically with the update.
- **fix-version-history-preview-restore-and-title-wrap** — version drawer fetches full snapshots (was "v undefined" + title-only restore); editor title wraps instead of clipping.
- **fix-search-palette-render-loop-and-copy-feedback** — killed an infinite React update loop on Ctrl+K; copy failures now surface.
- **fix-sticky-toolbar-gap-shortcut-hints-and-mobile-nav** — sticky editor toolbar pins flush (scroll-container padding moved to inner wrapper); platform-aware ctrl K hint; hidden mobile nav scrollbar.
- **fix-standardize-errors-toasts-previews-across-pages** — `normalizeErrorMessage` everywhere, `error(title, {description})` toast pattern, `previewText` fallback so code-only notes never show "empty note", snippet cards show fenced code only.
- **fix-theme-radius-coverage-across-all-surfaces** — ~50 bordered surfaces missing `rounded-none` fixed; audited to zero square offenders at 14px.

### Architecture and security
- **feat-httponly-auth-cookies-single-writer** — full BFF auth: /api proxy is the only cookie writer, both tokens HttpOnly, refresh rides the cookie, `lib/auth.ts` + js-cookie deleted, logged-in `/` redirect moved to middleware.
- **feat-server-rendered-markdown-viewer-for-public-pages** — react-markdown + remark-gfm + rehype-highlight server component replaces client-only TipTap on public pages (SEO, no editor bundle, no 64vh dead space); reuses `.tiptap` CSS.
- **feat-shared-format-clipboard-preview-libs-and-api-wrappers** — `lib/format.ts` (5 date styles), `lib/clipboard.ts`, `previewText`, `note-api`/`auth-api` wrappers (endpoint strings live in two files); killed 8 formatDate clones and the 200-vs-220 wpm divergence.
- **chore-remove-dead-sound-system-and-unused-assets** — dead sound system, 7 unused npm deps, 10 unused shadcn components, boilerplate SVGs removed.

### Design system
- **feat-ui-kit-chip-kbd-select-stat-empty-segmented** — shared atoms: Chip, Kbd, Select, StatTile, EmptyState, Segmented (mono lowercase, hairline, theme radius, `aria-pressed`).
- **refactor-dashboard-library-controls-to-ui-kit** / **refactor-shell-palette-capture-to-ui-kit** / **refactor-explore-snippets-ask-to-ui-kit** — every filter pill, kbd hint, stat cell, empty state, and view toggle app-wide now uses the kit.

### Theme system
- **feat-split-theme-axes-and-modal-scoped-preview** — colorway / typeface / corners are independent dials (`data-theme` / `data-font` / `data-radius`, own storage keys, "auto" = colorway's curated pairing); Theme Studio and onboarding preview inside the modal only — the app changes exclusively on apply.
- **feat-bigger-studio-preview-and-dial-addons** — full app-mock preview, font chips rendered in their own typefaces, radius glyphs, reset dials, draft summary, height-capped dialog.

### Search
- **feat-search-filters-auto-deep-sections-and-recovery** — inline operators (`tag:x type:snippet lang:sql`) mapped to backend FTS params, auto-escalation to deep search when local hits < 3, grouped sections (recent/actions/notes/deep results), "create a note for ‹query›" zero-result recovery.

### Editor and reading experience
- **refactor-compact-editor-type-selector-and-view-toggle** — four type cards → slim Segmented rail; Ctrl+E/view toggle plumbing.
- **feat-note-reading-view-default-with-edit-toggle** — existing notes open in a reading view (rendered markdown + quiet meta line); `e`/edit button to edit, Esc returns to reading; `?edit=1` deep-link. (Deep-research validated: Obsidian toggle model, read-by-default demand.)
- **feat-calm-editor-properties-strip-and-reading-width** — title first; one Obsidian-style properties strip (type rail + inline tags + public badge); 72ch centered measure; decorative gutter removed; Ctrl+1–4 type switching.
- **feat-premium-editor-chrome-macos-discipline** — macOS research applied: window-title toolbar, un-boxed inspector (11px labels, tabular label/value rows, hairlines, underline inputs), `markdown.ts` badge removed, soft macOS text selection, non-selectable chrome.
- **feat-block-insert-menu-selection-popover-and-code-headers** — empty-line menu is a vertical popover teaching markdown shortcuts (`#`, `-`, `[ ]`, ` ``` `…); selection toolbar restyled to the macOS popover recipe; rendered code blocks get language + copy headers in the viewer.

### Operations
- Production mode running locally: `next start` on :3000, uvicorn (2 workers, no reload) on :8000, detached processes, logs in session scratchpad.
- Known limitation: in-memory rate limiter counts per worker; needs Redis if deployed.

---

## 2. Active plan — editor typing performance (in flight)

**Symptom:** typing in the editor lags, worse on large notes.

**Diagnosis (from code paths, to be confirmed by measurement):** every keystroke currently pays
1. full-document markdown serialization in `RichEditor.onUpdate` (`storage.markdown.getMarkdown()`),
2. `setContent` in NoteForm → full NoteForm re-render,
3. three separate `stripMarkdown` full-document regex passes (wordCount, characterCount, readingTime) + outline extraction + code-block count,
4. a second full serialization in RichEditor's content-sync effect (compares `getMarkdown()` against the round-tripped `initialContent` prop).

**Fix plan:**
1. Debounce the `onChange` emit in RichEditor (~250 ms trailing) so serialization happens on idle, not per keystroke; autosave already debounces 2 s on top.
2. Track the last-emitted markdown in a ref; the sync effect skips `getMarkdown()` when `initialContent` equals the last emit (kills the second serialization).
3. NoteForm: compute `stripMarkdown(content)` once in a `useMemo`; derive words/chars from it; memoize code-block count.

**Measurement protocol (before/after evidence):**
- Create a throwaway large note (~40 KB markdown) via API.
- In the production build, run an in-page probe: focus `.ProseMirror`, `document.execCommand("insertText")` × 200 in a loop, report `performance.now()` delta (ms per 200 chars).
- Target: order-of-magnitude reduction; delete the throwaway note afterwards.

**Status:** plan defined; baseline measurement was interrupted — resume at "create large test note".

---

## 3. Backlog (prioritized, from audits + research)

1. **Editor typing performance** — see §2 (in flight).
2. **Ctrl+E conflict** — inside the text, TipTap's inline-code binding owns Ctrl+E; optionally rebind view toggle to Ctrl+Shift+E so it works everywhere (user not yet asked/confirmed).
3. **Slash-command menu** — Tiptap's official suggestion/slash-dropdown utilities (research top pick; requires re-adding `@tiptap/suggestion`).
4. **Public note page: sticky TOC + heading anchors** — slugified ids, hover `#` copy-link, IntersectionObserver scroll-spy, `scroll-margin-top`.
5. **Server-side `ts_headline` highlights** — replace client-side approximation in deep search results so highlighting honors Postgres stemming.
6. **Frecency ranking in palette** — `{count, lastUsedAt}` per opened note in localStorage, 7-day half-life boost on Fuse scores; empty-query shows recently opened notes.
7. **Route shape** — `/dashboard/edit_note?id=N` → `/dashboard/notes/[id]` dynamic segment; REST-style backend routes (`POST /notes`, `PATCH /notes/{id}`) while the API surface is still one client file.
8. **Read-based view counts** — stop incrementing on Explore feed listing; count only `/s/` reads (optionally deduped).
9. **Frontend test infrastructure** — none exists; contract tests would have caught the version-history and community-feed drift.
10. **Drag handles / block context menu** — Tiptap's now-MIT drag-handle extension (after slash menu).
11. **Dead-weight leftovers** — `_handoff/` stays untracked; `backend/scripts` cleanup; root `main.py` duplicate entry.

---

## 4. Conventions worth remembering

- Commits: short lowercase-hyphenated, author rahuldr07, no AI attribution, feature-by-feature, push after each verified slice.
- Theme radius flows through `rounded-none` (`[data-theme] .rounded-none { border-radius: var(--ui-radius) }`) — every enclosed surface must carry it.
- Chrome de-emphasis via opacity of one base color (85/50/25%), hairlines at ~10% opacity, accent reserved for the primary action + selection + caret.
- Test account: `uxtester@example.com` / `uxtest1234` (owns seeded notes, publishes, profile `uxtester`).
