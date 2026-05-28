# Life Drive — Progress

Tracking the milestones from the build prompt. Commit after each.

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Scaffold + design system + Daily Drive (mock data) | ✅ shipped |
| 2 | Supabase schema, RLS, auth, households + invites | ⏳ |
| 3 | Items CRUD + Kanban with drag/persist + realtime | ⏳ |
| 4 | Idempotent seed script (`life-drive-seed-data.json`) | ⏳ |
| 5 | Capture + Anthropic AI triage route | ⏳ |
| 6 | Prioritization engine → wire "Today's 3" to real data | ⏳ |
| 7 | Project decomposition / next actions (Anthropic) | ⏳ |
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
