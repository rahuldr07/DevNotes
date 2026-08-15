# DevNotes Worklog — shipped state, active plan, backlog

> Living document. Complements the vision docs (`DEVNOTES_1000X_ROADMAP.md`, `DEVNOTES_1000X_PRODUCT_UI_BLUEPRINT.md`) with what is actually shipped, what is in flight, and what is queued. Update this when a slice lands.

Last updated: 2026-08-14

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

## 1b. Shipped (August 2026 audit remediation)

A full read of the repo turned up a set of correctness, privacy and scale
problems; this is what was done about them. Each bullet is one pushed commit.

### Deployment blockers
- **fix-rate-limit-keying-token-types-and-production-config** — every request
  arrives through the BFF, so `get_remote_address` returned the proxy's
  address and the whole user base shared one bucket (60 req/min app-wide).
  Authenticated routes now key on the verified JWT subject; anonymous ones on
  the peer address, or a forwarded one behind `TRUST_FORWARDED_FOR` (the Next
  proxy drops client-supplied forwarding headers unless it is itself behind a
  trusted LB). Credential stuffing is now handled per account by a failure
  throttle rather than per IP. Also: access tokens carry `token_type`, so a
  refresh token can no longer be replayed as a bearer credential and outlive
  logout; `/health/db` answers 503 when the database is down instead of 200
  with an "unhealthy" body; CORS, `/docs` and secret validation are driven by
  `ENVIRONMENT`.
- **chore-fix-root-entrypoint-drop-fake-telemetry-and-second-lockfile** —
  root `main.py` raised `ModuleNotFoundError` (it imported `backend.app.main`,
  which imports `app.*`); the sidebar "Runtime" panel and the "● synced"
  status bar were fixed strings that measured nothing; `admin/bun.lock` sat
  beside the `package-lock.json` CI installs from.

### Correctness
- **refactor-service-owned-transaction-boundaries** — repositories staged and
  committed individually, so a service touching two tables could half-write.
  They flush now; services own the boundary via `database.transaction(db)`,
  and a test fails if any repository calls `db.commit()`.
- **fix-version-number-race-like-double-click-and-updated-at-bumps** — version
  numbers came from `max + 1` with no constraint (concurrent edits collided);
  a share_uuid retry rolled back the snapshot it had just written and never
  re-created it; a double-clicked like surfaced as 503 "database temporarily
  unavailable"; publish/explore toggles bumped `updated_at` and reordered
  "recently touched".
- **fix-search-offset-pagination-and-add-missing-indexes** — search results
  are ranked, and rank does not track id, so the `id < cursor` cursor dropped
  and repeated rows between pages. Search paginates by offset now. Added the
  GIN index on `notes.tags` that tag-filtered search always needed, plus a
  community-feed index.
- **fix-library-filters-sorting-and-counters-server-side** — the library's
  filters and sorts ran in the browser over the loaded page, so "sort by
  title" sorted twenty of five hundred notes, and a filter matching nothing on
  page one reported an empty library. Both moved into SQL, with the
  infinite-scroll sentinel detached from the last card so it exists whenever
  another page does.

### Privacy
- **feat-separate-published-link-from-public-listing** — `is_published` did
  double duty: it minted the share link *and* put the note on the author's
  public profile and into the cross-author related-reading rail, while the
  share dialog said only "anyone with the URL can read this note". Added
  `is_listed`; publishing is now just the link. Existing notes backfill to
  `is_listed = is_published`, so nothing disappeared from a profile — the
  state is simply visible and switchable now, and new publishes start
  unlisted.
- **fix-validate-profile-links-like-note-source-urls** — profile links took
  any string while note `source_url` was scheme-checked. React 19 neutralises
  `javascript:` hrefs at render time (verified), so this was broken data
  rather than a live XSS, but the two surfaces now agree.
- **fix-view-counts-count-readers-not-server-fetches** — the public page is
  server-rendered, so the GET-side increment counted the Next server's fetch,
  prefetches and crawlers included; and it was a write on the one endpoint an
  anonymous caller can hammer. Counting is now an explicit POST the browser
  makes once per session. The Explore feed no longer increments a view for
  every note that merely appears in a listing.

### Scale
- **feat-server-side-workspace-stats-and-activity-endpoints** +
  **feat-server-side-explore-search-topics-and-trending** — every counter on
  the dashboard, Explore and the snippets page was a tally of the currently
  loaded page, and Explore's search box only searched what had been scrolled
  into view. Added `/notes/stats`, `/notes/activity` and
  `/notes/community/stats`; moved Explore's search, topic filter and trending
  rank into SQL. The heatmap reads real activity instead of the newest 100
  notes; the snippets page paginates instead of capping at 80.
- **perf-batch-like-counts-and-send-previews-not-note-bodies** — related
  reading ran a COUNT per card; profile and related lists shipped every note's
  full markdown so the browser could render a two-line preview.
- **perf-debounce-editor-serialization-and-protect-unsaved-drafts** — the
  typing-lag fix from §2, plus: create mode never autosaved and nothing
  guarded navigation, so closing the tab lost the draft silently.

### Testing
- **test-add-postgres-integration-suite-and-ci-service** — `get_db` was
  overridden with `None` everywhere, so no test had ever run a migration or
  the Postgres half of the code. `tests/integration/` applies every migration
  (down to base and back up) and exercises the real queries; CI runs a
  postgres:16 service and sets `REQUIRE_INTEGRATION_DB=1` so a skip fails the
  build. It paid for itself immediately: the new `search_vector` expression
  was rejected by PostgreSQL as non-IMMUTABLE, and the ranking test showed
  `ts_rank` scored a title hit the same as a passing body mention — the vector
  now uses `setweight` (title A, tags B, body C).

### Operations
- **feat-full-stack-docker-compose-and-dockerfiles** — `compose.yaml` only
  ever defined Postgres, so the roadmap's "one-command local startup" was
  unmet. `npm run stack:up` now brings up database, migrations, API and web.

### Known gaps after this pass
- Rate-limit and login-throttle counters are still per worker; both want Redis.
- Password reset and email verification still need an email provider decision.
- No frontend test infrastructure (backlog §3.9 stands).
- Activity days are bucketed in the database's timezone; the heatmap grid is
  drawn in the viewer's. Off-by-one at the edges for non-UTC users.

---

## 1c. Shipped (August 2026 editor + UI pass)

Researched against the Tiptap v3 docs, the WAI-ARIA authoring practices, and
current scroll-spy guidance; verified by driving the real app in Chromium
(40 assertions: `_handoff`-free Playwright script, screenshots reviewed).

### Editor
- **chore-align-tiptap-packages-and-add-editor-extensions** — the tree had
  drifted (core hoisted to 3.30 while everything else sat at 3.20). All
  `@tiptap/*` now pin `^3.30.1`.
- **feat-slash-menu-tables-drag-handles-and-markdown-export**
  - **Slash menu** on `/`, built on `@tiptap/suggestion` (Tiptap's documented
    route — their slash extension is unpublished). Filters as you type,
    arrow/Home/End/Enter/Tab/Escape, grouped, and it will not fire inside code
    or mid-word (`src/lib` stays a path). Blocks come from one registry that
    the empty-line insert popover also reads, so the two menus cannot drift.
  - **Tables** via `TableKit`, with add-row/add-column/delete in the selection
    toolbar. `tiptap-markdown` already ships a GFM table serializer, so they
    round-trip.
  - **Drag handles** via `@tiptap/extension-drag-handle-react` — MIT since
    Tiptap opened up the Pro extensions in June.
  - **Ctrl+Shift+E** for the reading view (backlog §3.1). Ctrl+E belongs to
    TipTap's inline-code binding, so the old shortcut only worked from outside
    the writing surface.
  - **Markdown export** — copy or download `.md` with YAML front matter
    (title, type, tags, source, timestamps) from the reading view.
  - The shortcuts overlay never documented the editor at all; it does now.

### Public reading
- **feat-heading-anchors-and-sticky-table-of-contents** (backlog §3.3) —
  slugged heading ids via `rehype-slug`, hover deep-links that copy the
  absolute URL, and a sticky TOC with IntersectionObserver scroll-spy. The
  band is the top 30% of the viewport, so the highlight tracks what is being
  read rather than what has just appeared at the bottom edge. `github-slugger`
  is shared by the renderer and the TOC builder, so duplicate headings get
  matching `-1`/`-2` suffixes on both sides instead of dead links.

### Retrieval and accessibility
- **feat-accessible-palette-frecency-ranking-and-reduced-motion**
  - The command palette now implements the ARIA combobox/listbox pattern:
    focus stays on the input, `aria-activedescendant` announces the active
    row, options carry `role="option"`, and the active row is scrolled into
    view (browsers do not do that for activedescendant targets).
  - **Frecency ranking** (backlog §3.5) — `{count, lastUsedAt}` per opened
    note, 7-day half-life, saturating and capped so a stale favourite can
    never outrank a strong text match. Empty query lists what you actually
    return to.
  - Focus trap + focus restore for the version drawer (it had neither), and
    `MotionConfig reducedMotion="user"` plus a CSS reset so
    `prefers-reduced-motion` is honoured app-wide rather than component by
    component.

### Found by driving the browser
- **fix-sticky-sidebar-toc-tail-section-and-onboarding-scope**
  - The theme onboarding dialog rendered on **every** route: it covered the
    signup form, and a stranger opening a shared link got "choose your theme"
    over the article. Now workspace-only.
  - `overflow-hidden` on the public page root silently disabled
    `position: sticky` for everything inside it. The clipping moved to the
    decorative layer that actually needs it.
  - Scroll-spy could never reach the **last** section: near the document end
    the final heading sits below the reading band with no scroll left to give.
    Added an at-bottom rule.

### Known gaps after this pass
- Still no frontend test infrastructure (backlog §3.8). The Playwright script
  used here lives outside the repo; turning it into a committed suite is the
  obvious next step and would have caught all three bugs above automatically.
- Tables render but have no keyboard-only insert path beyond the slash menu.
- The editor typing measurement (§2) is still unrun.

---

## 2. Editor typing performance — done (August 2026)

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

**Status:** fix shipped in
**perf-debounce-editor-serialization-and-protect-unsaved-drafts**. Steps 1-3
above are in place: the emit is debounced 250 ms, the sync effect compares
against the last emitted markdown before serializing, and NoteForm derives
words/characters/reading time from a single memoized strip pass.

The before/after measurement in the protocol above has still not been run —
the change is reasoned from the code paths, not measured. Worth doing against
a large note before calling the number.

---

## 3. Backlog (prioritized, from audits + research)

1. ~~**Ctrl+E conflict**~~ — done: the view toggle is Ctrl+Shift+E.
2. ~~**Slash-command menu**~~ — done, on `@tiptap/suggestion`.
3. ~~**Public note page: sticky TOC + heading anchors**~~ — done.
4. **Server-side `ts_headline` highlights** — replace client-side approximation in deep search results so highlighting honors Postgres stemming.
5. ~~**Frecency ranking in palette**~~ — done.
6. **Route shape** — `/dashboard/edit_note?id=N` → `/dashboard/notes/[id]` dynamic segment; REST-style backend routes (`POST /notes`, `PATCH /notes/{id}`) while the API surface is still one client file.
7. ~~**Read-based view counts**~~ — done: the Explore listing no longer increments, and `/s/` reads are counted by a browser-issued POST once per session.
8. **Frontend test infrastructure** — none exists; contract tests would have caught the version-history and community-feed drift, and a committed Playwright suite would have caught the sticky/onboarding/scroll-spy bugs in §1c.
9. **Block context menu** — drag handles shipped; a right-click/handle menu (duplicate, delete, turn into) is still open.
10. **Dead-weight leftovers** — `_handoff/` stays untracked; `backend/scripts` cleanup. (Root `main.py` fixed; `admin/bun.lock` removed.)
11. **Redis for rate limits and login throttling** — both stores are in-process, so budgets are per uvicorn worker.
12. **Heatmap timezone** — activity is bucketed in the database's timezone and drawn in the viewer's; edges can be off by a day for non-UTC users.
13. **Measure the editor typing fix** — the debounce/memoization landed reasoned from the code paths; the before/after probe in §2 has not been run.

---

## 4. Conventions worth remembering

- Commits: short lowercase-hyphenated, author rahuldr07, no AI attribution, feature-by-feature, push after each verified slice.
- Theme radius flows through `rounded-none` (`[data-theme] .rounded-none { border-radius: var(--ui-radius) }`) — every enclosed surface must carry it.
- Chrome de-emphasis via opacity of one base color (85/50/25%), hairlines at ~10% opacity, accent reserved for the primary action + selection + caret.
- Test account: `uxtester@example.com` / `uxtest1234` (owns seeded notes, publishes, profile `uxtester`).
