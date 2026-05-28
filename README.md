# Life Drive

A personal/family chief of staff that turns 100+ todos into three scheduled actions a day.

**Core loop:** capture everything → AI decides what matters → break it into a tiny next step → book it into the calendar → show up and do it → review and repeat.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling/motion:** Tailwind CSS + Framer Motion + iOS-style frosted glass primitives
- **PWA:** Serwist (installable, offline shell, background sync)
- **Backend:** Supabase — Postgres + Auth + RLS + Realtime
- **AI:** Anthropic Messages API (Haiku 4.5 for triage, Sonnet 4.6 for reasoning, Opus 4.7 reserved for heavy planning)
- **Calendar:** Google Calendar API (two-way, OAuth offline access)
- **Client data:** TanStack Query + Zustand
- **Deploy:** Vercel + Supabase

## Quick start

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env.local
# Fill in: Supabase URL/keys, Anthropic key, Google OAuth client.

# 3. Database (after running supabase init / linking)
supabase db reset             # applies migrations in supabase/migrations
npm run seed                  # idempotent seed from life-drive-seed-data.json

# 4. Dev
npm run dev
```

Open http://localhost:3000.

## Project structure

```
src/
  app/                # Next.js routes (App Router)
    layout.tsx        # Root layout, PWA metadata, TabBar
    page.tsx          # / Daily Drive
    capture/          # Brain dump → AI triage
    boards/           # Kanban
    item/[id]/        # Project / task detail
    calendar/         # Day + week + auto-schedule
    review/           # Weekly review
    areas/            # Life balance wheel
    onboarding/       # First-run flow
    settings/         # Profile, integrations, household
    api/              # Server routes (Anthropic, Google, scheduling)
    sw.ts             # Serwist service worker source
    manifest.ts       # PWA manifest
  components/
    glass/            # GlassCard, SwipeRow, PriorityRing, BalanceWheel, TabBar, AreaPill, PageHeader
    drive/            # Daily Drive composition
  lib/
    design.ts         # Life area colors, springs
    utils.ts          # cn(), date helpers, formatters
    mock-data.ts      # Pre-DB mock for milestone 1
  types/
public/               # Icons (PNG + SVG)
supabase/             # Migrations + seed (later milestones)
scripts/seed.ts       # Idempotent seed loader
```

## PWA install

The manifest, theme color, and Apple-touch icons are all wired. On iOS Safari:

> Share → Add to Home Screen

The app loads in standalone mode, no browser chrome.

## Security model

- **Anthropic key** is **server-only**. All triage / decompose / explain calls go through `/api/*` route handlers.
- **Google tokens** live in the `google_accounts` table, never returned to the client.
- **RLS** is enabled on every table; household membership is the sharing boundary.
- The auto-scheduler **proposes** and only writes Google events on explicit user **accept**, and only to events Life Drive itself created (tagged with the `LIFE_DRIVE_EVENT_TAG` extended property).

## Milestones

See [`PROGRESS.md`](./PROGRESS.md).
