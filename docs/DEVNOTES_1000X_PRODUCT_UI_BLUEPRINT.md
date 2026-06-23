# DevNotes 1000x Product + UI Blueprint

> Execution blueprint for turning DevNotes into a premium developer knowledge cockpit. This is the implementation map we should follow from here.

---

## 0. Product North Star

DevNotes should become a **developer knowledge cockpit**: a place where developers capture notes/snippets/docs, retrieve them instantly, publish them beautifully, and later ask AI across everything.

### Core promise

```text
Capture fast. Reuse smarter. Publish beautifully.
```

### Differentiation

DevNotes is not another generic notes app. It should feel like:

```text
VS Code command speed
+ Obsidian knowledge depth
+ GitHub Gist snippet utility
+ Hashnode-style public identity
+ AI-native search over personal knowledge
```

### North star metric

**Weekly Knowledge Reuse Events**

A reuse event is:

- Opening an old note from search.
- Copying a snippet/code block.
- Reusing a template.
- Publishing a note.
- Sharing a public link.
- Asking AI and opening cited notes.

---

## 1. Current Foundation Snapshot

### Already strong

- Next.js 16 frontend with App Router.
- FastAPI backend.
- PostgreSQL/Alembic setup.
- JWT + refresh token sessions.
- Notes CRUD.
- Tags.
- Public sharing.
- Public profiles.
- Explore feed.
- Likes/views.
- Version history.
- Search palette.
- Polished theme-driven visual system.
- Auth refresh fallback now hardened.

### Current product problem

The foundation is good, but the product still feels like a polished notes dashboard. To become 1000x, it needs a stronger **workflow loop**:

```text
Capture -> Organize -> Retrieve -> Reuse -> Publish -> Grow reputation
```

Everything we build next should strengthen that loop.

---

## 2. Design Language: Developer Editorial Cockpit

### Visual personality

- Dark, focused, editor-like.
- Dense but readable.
- Calm premium surfaces.
- Fast command interactions.
- Public pages should feel editorial, not dashboard-like.
- Code blocks and snippets should feel first-class.

### Keep

- Code-editor-inspired auth/workspace style.
- Theme picker concept.
- Dashboard cockpit shell.
- Command/search bar as central UX.

### Improve

- More purposeful information hierarchy.
- Fewer decorative cards without action.
- More “developer utility” in every screen.
- Stronger empty states and quick capture.
- More keyboard-first interactions.

---

## 3. Product Pillars

## Pillar A: Capture Fast

Goal: user can save something in seconds without choosing many fields.

### Build

- Quick capture bar on dashboard.
- Intent detection: note, snippet, link, command, task.
- Keyboard shortcut: `N` or `Ctrl/Cmd + K -> New`.
- Save draft instantly.
- Recent capture strip.

### UI concept

```text
[ What do you want to remember? ____________________ ]
  Enter saves quick note
  /snippet starts snippet mode
  /link saves URL
  /todo saves task
```

### Validation

- New user can create first note in under 15 seconds.
- No modal required for basic capture.

---

## Pillar B: Reuse Smarter

Goal: old knowledge should resurface quickly.

### Build

- Upgrade dashboard search into a global command palette.
- Search modes: notes, snippets, tags, public, commands.
- Result preview panel.
- Keyboard navigation.
- Copy snippet/code directly from result.
- Recent searches.

### UI concept

```text
Ctrl/Cmd + K
  docker compose
    Notes
    Snippets
    Commands
    Ask AI later
```

### Validation

- User can find and open a note without touching mouse.
- Search result has enough preview to choose correctly.

---

## Pillar C: Developer Snippet Library

Goal: become better than plain notes for code-heavy knowledge.

### Build

- Add `note_type`: note, snippet, guide, checklist.
- Snippet cards with language, copy button, tags.
- Code block copy buttons everywhere.
- Snippet collection page.
- Snippet quick capture.

### Why this matters

Developers do not only write prose. They save commands, configs, stack traces, SQL, Docker files, hooks, regex, and reusable patterns.

### Validation

- User can save and copy a snippet in under 10 seconds.
- Public snippet pages look like premium gist pages.

---

## Pillar D: Publish Beautifully

Goal: public notes and profiles become a developer portfolio.

### Build

- Better public note page typography.
- Author card.
- Related notes.
- Reading time.
- SEO metadata.
- Open Graph image generation later.
- Public profile hero with bio/socials/featured notes.
- Follow system later.

### UI direction

Public pages should feel like a technical magazine, not a dashboard export.

### Validation

- A shared note looks credible enough to post on LinkedIn/Twitter/GitHub.
- Public profile explains what the user knows in under 5 seconds.

---

## Pillar E: AI-Native Knowledge

Goal: AI should be useful because it knows the user’s notes.

### Build later, after search/snippets are strong

- Embedding pipeline with pgvector.
- Chunk notes.
- Semantic search endpoint.
- AI ask page with cited sources.
- Suggested tags.
- Summarize note.
- Turn note into public guide.

### Critical rule

AI answers must cite source notes. No citations means low trust.

### Validation

- Every AI answer links back to notes.
- User can save an AI answer as a note.

---

## 4. Main App Information Architecture

### Near-term navigation

```text
Dashboard
Notes
Snippets
Explore
Search / Command Palette
Profile
Settings
```

### Later navigation

```text
Dashboard
Notes
Snippets
Collections
Templates
AI
Explore
Profile
Workspace
Settings
```

### Route plan

```text
/dashboard
/dashboard/create_note
/dashboard/edit_note
/dashboard/explore
/dashboard/snippets        <- next major product route
/dashboard/settings        <- needed soon
/u/:username
/s/:share_uuid
```

---

## 5. Screen-by-Screen UI Blueprint

## 5.1 Dashboard Home

### Purpose

Make user feel in control immediately.

### Must contain

- Quick capture.
- Recent notes.
- Pinned notes.
- Snippet shortcuts.
- Public performance summary.
- Search/command entry.

### Next UI upgrade

Replace the current big hero-only feel with a more useful cockpit:

```text
Top: command bar + create
Hero: quick capture + stats
Main left: recent/pinned notes
Main right: snippets, activity, publish queue
```

### Implementation slice

1. Add QuickCapture component.
2. Add PinnedNotes section from existing notes.
3. Add RecentNotes section.
4. Add “Publish queue” card for private notes that could be shared.

---

## 5.2 Notes Library

### Purpose

Manage and retrieve notes.

### Must contain

- Search.
- Sort.
- Grid/list/compact.
- Tags.
- Pinned state.
- Preview.
- Bulk actions later.

### Next UI upgrade

Add a split view option:

```text
Left: filters/tags
Center: notes list
Right: selected note preview
```

### Implementation slice

1. Keep current grid/list.
2. Add compact view.
3. Add right preview for selected note on desktop.
4. Add empty states with suggested templates.

---

## 5.3 Editor

### Purpose

Writing should feel premium and powerful.

### Must contain

- Title input.
- Rich editor.
- Save status.
- Tags.
- Publish/share controls.
- Version history.
- Preview/focus mode.

### Next UI upgrade

Make it feel more like a code editor/writing IDE:

```text
Top bar: breadcrumb, save state, publish/share
Main: document canvas
Right rail: tags, visibility, outline, versions
Bottom: shortcuts/help
```

### Implementation slice

1. Add autosave state UI.
2. Add right metadata rail.
3. Add mode switch: Write / Preview / Publish.
4. Add code block copy button.

---

## 5.4 Snippets

### Purpose

Make DevNotes uniquely valuable for developers.

### Must contain

- Snippet type.
- Language.
- Copy button.
- Tags.
- Search.
- Public/private visibility.

### First version

Use existing notes table with `note_type = snippet` and optional metadata.

### Backend model direction

```text
notes
  note_type: note | snippet | guide | checklist
  language: nullable string
  source_url: nullable string
```

### Implementation slice

1. Add migration for note type/language/source_url.
2. Add frontend type updates.
3. Add snippet create mode.
4. Add `/dashboard/snippets` page.
5. Add copy event tracking later.

---

## 5.5 Explore

### Purpose

Discover public knowledge and motivate publishing.

### Must contain

- Trending/recent switch.
- Search public notes.
- Topic filters.
- Like/save.
- Author profile links.

### Next UI upgrade

Make Explore feel less like note cards and more like a developer discovery feed:

```text
Featured guide
Trending snippets
Fresh notes
Top authors
Topics
```

### Implementation slice

1. Add topic/tag chips.
2. Add featured/trending rail.
3. Add save/bookmark later.

---

## 5.6 Public Profile

### Purpose

Show a developer’s knowledge identity.

### Must contain

- Avatar/name/username.
- Bio.
- Expertise tags.
- Featured notes.
- Public notes.
- Stats.
- Social links later.

### Implementation slice

1. Add profile settings fields: username, bio, website, GitHub, Twitter.
2. Add featured public note flag.
3. Upgrade profile page hero.

---

## 5.7 Public Note Page

### Purpose

Make shared notes beautiful and credible.

### Must contain

- Excellent typography.
- Author card.
- Reading time.
- Tags.
- Like/view counts.
- Copy link.
- Related notes.

### Implementation slice

1. Add reading-time utility.
2. Add related public notes by tags.
3. Add public like button using share UUID.
4. Add SEO metadata.

---

## 6. Backend Blueprint

## 6.1 Immediate backend upgrades

### Snippet support

Add fields:

```text
note_type enum/string default note
language nullable
source_url nullable
```

### Profile support

Add fields:

```text
username unique
bio nullable
website_url nullable
github_url nullable
twitter_url nullable
avatar_url nullable
```

### Public note support

Add:

```text
featured boolean default false
reading_time_minutes computed or stored
```

---

## 6.2 Search V2

### Current

Keyword search exists.

### Next

- Search by title/content/tags/type.
- Public search.
- Snippet-only search.
- Better ranking.

### Later

- pgvector semantic search.
- Hybrid ranking.
- AI source citations.

---

## 6.3 Events and Analytics

To optimize the product, track reuse.

### Add table later

```text
knowledge_events
  id
  user_id
  note_id nullable
  event_type
  metadata jsonb
  created_at
```

### Events

- note_created
- note_opened_from_search
- snippet_copied
- note_published
- public_note_viewed
- public_note_liked
- ai_answer_saved

---

## 7. Implementation Order

## Phase 1: Make the core loop excellent

### 1. Quick Capture Dashboard

- Add dashboard quick capture.
- Create note instantly.
- Toast success.
- Refresh list.

**Validation:** create note from dashboard in one submit.

### 2. Snippet Foundation

- Add note type/language fields.
- Add snippet UI.
- Add snippet list page.
- Add copy buttons.

**Validation:** create, list, copy snippet.

### 3. Editor Workbench Upgrade

- Right rail.
- Save status.
- Mode switch.
- Better publish/share controls.

**Validation:** edit/publish flow is obvious without hunting.

### 4. Public Reading Polish

- Reading time.
- Related notes.
- Author card.
- Better typography.

**Validation:** public note feels share-worthy.

---

## Phase 2: Make discovery and profile valuable

### 5. Profile Settings

- Username/bio/socials.
- Avatar placeholder.
- Profile preview.

### 6. Explore V2

- Topic filters.
- Trending sections.
- Top authors.

### 7. Public Engagement

- Like from public page.
- Save/bookmark public notes.
- Follow users later.

---

## Phase 3: Make it intelligent

### 8. Search V2

- Better filters.
- Type-aware results.
- Snippet copy from search.

### 9. Semantic Search

- pgvector.
- Embedding jobs.
- Chunking.

### 10. AI Ask

- Ask notes.
- Source citations.
- Save answer as note.

---

## Phase 4: Make it SaaS-ready

### 11. Workspaces

- Workspace model.
- Members.
- Roles.

### 12. Import/Export

- Markdown import.
- ZIP export.
- Obsidian import later.

### 13. Production hardening

- Docker Compose.
- CI.
- Error logging.
- Redis rate limit store.
- Background workers.

---

## 8. Immediate Next Build Slice

The best next slice is **Quick Capture + Snippet Foundation**.

Why:

- It strengthens the core product loop.
- It makes DevNotes more developer-specific.
- It creates a reason to use DevNotes daily.
- It is achievable without waiting for AI infrastructure.

### Slice A: Quick Capture

Files likely involved:

```text
admin/src/app/dashboard/page.tsx
admin/src/components/QuickCapture.tsx
admin/src/lib/note-api.ts
```

Backend likely already supports note creation.

### Slice B: Snippet Foundation

Files likely involved:

```text
backend/app/models/note.py
backend/alembic/versions/*
backend/app/schemas/note.py
backend/app/routers/notes.py
admin/src/types/notes.ts
admin/src/app/dashboard/snippets/page.tsx
admin/src/components/SnippetCard.tsx
```

### Acceptance criteria

- Dashboard has a fast capture input.
- User can choose note vs snippet.
- Snippet stores language.
- Snippet list page exists.
- Snippet card has copy button.
- Lint/typecheck/build pass.
- Backend tests pass.
- Changes committed.

---

## 9. Quality Bar

Every feature must pass these questions:

1. Does it make capture faster?
2. Does it make retrieval better?
3. Does it help reuse knowledge?
4. Does it make public sharing more beautiful?
5. Does it feel developer-native?
6. Is it keyboard-friendly?
7. Is it tested or validated?

If no, do not build it yet.

---

## 10. Execution Rule

From now on, implement in this order unless a critical bug appears:

```text
1. Quick Capture
2. Snippet Foundation
3. Editor Workbench Upgrade
4. Public Reading Polish
5. Profile Settings
6. Explore V2
7. Search V2
8. Semantic Search + AI
9. Workspaces
10. Production hardening
```

This keeps the product moving from polished notes app to real developer knowledge platform.
