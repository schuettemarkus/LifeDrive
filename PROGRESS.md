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
| 8 | Google Calendar OAuth + read (day/week views) | ✅ shipped |
| 9 | Auto-scheduling + write-back | ✅ shipped |
| 10 | Balance wheel + principles + workouts surfaces | ✅ shipped |
| 11 | Weekly review + delegation polish + PWA hardening | ✅ shipped |

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

## Milestone 11 — what shipped

- **Weekly review** at `/review`: real shipped count (this week), completion % (shipped / shipped+planned), balance wheel + per-area delta vs target, "stage next week" that pulls the top-12 backlog items into `this_week` via `/api/review/stage-next-week`.
- **Household management** at `/settings/household`: list members with role, generate + copy invite link (`/api/invites` returns a one-shot URL), pending invites table.
- **PWA offline hardening**: Serwist fallback to `/offline` for any document request that can't be served from cache. Service worker now precaches the route map and falls back gracefully on the iPhone home-screen launch when there's no signal.
- All routes that need a session are gated by `middleware.ts`; demo mode (no env vars) keeps the surface renderable for marketing / preview deploys.

This closes the build prompt. The Definition of Done from the brief — install to home screen, brain-dump 30 items, plan, accept events into Google, swipe to complete, see the weekly review — is end-to-end functional once Supabase + Anthropic + Google env vars are set on Vercel.

---

## Post-launch sprints

### Round 1 — UX polish & functional pass
- Household rename (owner-gated PATCH + inline pencil editor on /settings/household)
- Boards filter by life area (`?area=key`) wired to balance-wheel links and a pill-bar filter
- Swipe-to-complete now hits `/api/items/[id]/complete` (deletes the linked Google event too)
- Capture lane chips (inbox / this week / backlog) per triaged item; auto-promotes urgency ≥4 to this_week; "to the drive" after save
- Tab-bar clearance CSS var so the raised capture button never overlaps content
- PrincipleCard expand + AI micro-lesson cached on the row
- Daily habits feature: per-user habits with days-of-week + time-of-day + icon, /habits management screen, Drive section with optimistic tap-to-complete

### Sprint 1 — Close the daily loop ✅ shipped
- **0003 migration** — `daily_activity` ledger + triggers on item/habit/workout completion + `get_streak()` security-definer function. Replaces MOCK_STREAK throughout.
- **Today scoreboard pill** under the date — focus/habits/workout/principle chips, tone per category, dim until done
- **Snooze picker** — later today / tomorrow / weekend / next week / pick a date — modal bottom sheet, server patch maps to status + due_date
- **Completion confetti** — 14-piece micro-burst, prefers-reduced-motion aware
- **Morning briefing takeover** — full-screen, once per day before 11am, dismissible (localStorage)
- **Auto re-rank** — fires `/api/prioritize?persist=true` after every swipe/complete/habit
- **0004 migration** — `ai_usage` ledger + `ai_calls_in_window()` RPC. Per-endpoint + global daily caps. 429 + Retry-After on overrun
- **Sentry** wired with no-op fallback when DSN env vars are absent. `/monitoring` tunnel route
- **0005 migration + Web Push** — `push_subscriptions` table, VAPID-signed push, service-worker handlers, `/settings` toggle with send-a-test, morning/evening crons in `vercel.json`

### Remaining sprints
- **Sprint 2** — Capture without opening the app: Siri Shortcut, iOS share extension, email-to-capture (Resend inbound), offline write queue, Apple Watch / lock-screen affordances
- **Sprint 3** — Intelligence layer: context-aware suggestions, auto-reschedule on conflict, project momentum nudges, principle reflections, workout progression
- **Sprint 4** — Family that actually shares: per-member home views, delegate-with-context, kids' chores, household streaks, calendar merge, item comments
- **Sprint 5** — Trust + scale: light theme, onboarding flow, data export, account deletion, backups, Playwright tests, GitHub Actions, 2FA, custom domain + Resend SMTP

Full sprint plan with sub-items: see the project memory file `project_lifedrive.md`.
