# Life Drive — Progress

Tracking the milestones from the build prompt. Commit after each.

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Scaffold + design system + Daily Drive (mock data) | ✅ shipped |
| 2 | Supabase schema, RLS, auth, households + invites | ✅ shipped |
| 3 | Items CRUD + Kanban with drag/persist + realtime | ✅ shipped |
| 4 | Idempotent seed script (`life-drive-seed-data.json`) | ✅ shipped |
| 5 | Capture + Anthropic AI triage route | ✅ shipped |
| 6 | Prioritization engine → wire "Today's 3" to real data | ✅ shipped |
| 7 | Project decomposition / next actions (Anthropic) | ✅ shipped |
| 8 | Google Calendar OAuth + read (day/week views) | ⏳ |
| 9 | Auto-scheduling + write-back | ⏳ |
| 10 | Balance wheel + principles + workouts surfaces | ⏳ |
| 11 | Weekly review + delegation polish + PWA hardening | ⏳ |

## Milestone 1 — what shipped

- Next.js 15 (App Router) + React 19 + TS scaffold, Tailwind config with the design tokens from the brief (canvas, glass, accent gradient, area colors), Framer Motion installed, Serwist PWA wired up.
- **Glass primitives** in `src/components/glass/`: `GlassCard`, `SwipeRow` (swipe-right complete / swipe-left snooze), `PriorityRing`, `BalanceWheel` (radial polygon w/ spoke dimming), `TabBar` (raised primary capture button + active dot), `AreaPill`, `PageHeader`.
- **Daily Drive** (`/`) renders against mock data: greeting + date + streak, "today's focus" with a hero card + two ranked rows, today's schedule strip with focus blocks visually distinct from events, today's principle card, today's workout with the satisfying check micro-animation.
- Route stubs for `/capture`, `/boards`, `/calendar`, `/review`, `/areas`, `/onboarding`, `/settings`, `/item/[id]`.
- PWA: `manifest.ts` (Next metadata API), Serwist service worker source, favicon SVG + 192/512/maskable PNG icons + 180x180 Apple touch icon, share-target wired to `/capture`.
- `.env.example`, `README.md`, this `PROGRESS.md`.

The aesthetic is locked first, per the build order. Real data + auth land next.

## Milestone 2 — what shipped

- Postgres schema in `supabase/migrations/0001_init.sql`: enums, households, household_members, profiles, invites, items, schedule_blocks, principles, workouts, reviews, google_accounts. Indexes on the hot paths (household+status, household+area, priority). `updated_at` triggers. Auto-create profile on new auth user.
- RLS enabled on every table. Households are the sharing boundary. `is_member_of()` security-definer helper avoids RLS recursion. `private` items hide from other household members. `google_accounts` is unreadable by clients (service-role-only).
- Realtime publication adds `items`, `schedule_blocks`, `principles`, `workouts`.
- Supabase clients: `src/lib/supabase/{client,server,middleware}.ts`. Browser, server-with-cookies, and service-role (server-only) variants.
- Next.js `middleware.ts` redirects unauthenticated users away from protected routes; gracefully no-ops if env vars are missing (so preview deploys still render the marketing/mock surface).
- Auth pages: `/auth/sign-in` (magic link **and** Google OAuth with `calendar.readonly` + `calendar.events` scopes), `/auth/callback` (exchanges code for session + persists Google refresh token into `google_accounts` server-side), `/auth/sign-out`.
- Household lifecycle: `src/lib/household.ts` (`createHousehold`, `createInvite`, `acceptInvite`) + API routes at `/api/households`, `/api/invites`, `/api/invites/accept`. Onboarding screens at `/onboarding/household` and `/onboarding/join`.
- `supabase/config.toml` for local dev (`supabase start`). Health route at `/api/health` for env presence + uptime.
