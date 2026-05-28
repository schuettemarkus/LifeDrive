# Build prompt: Life Drive

> Paste this entire file into Claude Code as the project brief. Build it as a real, deployable application — not a prototype. Work in milestones (see "Build order"), commit after each, and keep a running `PROGRESS.md`.

---

## 1. Mission

Build **Life Drive** — a personal/family "chief of staff" that turns an overwhelming 100+ item to‑do list into three scheduled actions a day. The core insight driving every decision: *a long list is a prioritization tax the brain refuses to pay, so it avoids the list entirely.* Life Drive pays that tax automatically. The user should open the app and see almost nothing — today's three things, already time‑blocked into their real calendar — while the other 97 stay out of sight until they're relevant.

Everything below serves one loop: **capture everything → AI decides what matters → break it into a tiny next step → book it into the calendar → show up and do it → review and repeat.**

---

## 2. Locked decisions (do not relitigate)

- **Scope:** Full working app, all features wired to real data and live integrations.
- **Platform:** Mobile‑first **PWA** (installable to iOS/Android home screen, offline shell, responsive up to desktop). No native app.
- **Audience:** **Family‑shared from day one** — multi‑user households with delegation, shared boards, and a merged family calendar. Personal/private items coexist with shared ones.

---

## 3. Tech stack

- **Framework:** Next.js (App Router) + TypeScript. `next-pwa` (or Serwist) for manifest + service worker (installable, offline app shell, background sync for queued mutations).
- **Styling/motion:** Tailwind CSS + Framer Motion. Build a small set of reusable primitives: `<GlassCard>`, `<SwipeRow>` (swipe‑to‑complete / swipe‑to‑snooze), `<PriorityRing>`, `<BalanceWheel>`, animated bottom tab bar.
- **Backend/data:** **Supabase** — Postgres, Auth (email magic link + Google OAuth), Row‑Level Security on every table, Realtime subscriptions (so family members see updates live). Use Supabase Edge Functions or Next.js route handlers for anything touching secrets.
- **Integrations:** Google Calendar API (two‑way) and the Anthropic API (see §8). All secret‑bearing calls run server‑side only.
- **Client data layer:** TanStack Query for server state with optimistic updates; Zustand for ephemeral UI state.
- **Deploy:** Vercel (web) + Supabase (managed). Provide a `.env.example` and a `README` with setup steps.

---

## 4. Design system — the "$1M UI"

Aesthetic = **iOS frosted glass + Google Inbox interaction model + Sleeper's energetic dark, card-based feel.** This is the differentiator; treat it as a first-class requirement, not polish-at-the-end.

**Foundations**
- **Dark-first.** Base canvas `#0A0A0F` with a very subtle, near-static radial gradient mesh behind the glass (deep violet → black) for depth. Provide a light theme too, but design dark first.
- **Glass surfaces:** `background: rgba(255,255,255,0.06)`, `backdrop-filter: blur(20px) saturate(140%)`, `border: 1px solid rgba(255,255,255,0.08)`, soft elevation `box-shadow: 0 8px 32px rgba(0,0,0,0.45)`, corner radius **24px** on cards (iOS feel), pills for tags.
- **Signature accent gradient** (Sleeper energy): violet `#7C5CFF` → cyan `#00D4FF`, used on the primary CTA, active nav, progress rings, and "focus" calendar blocks. Warm celebratory accent `#FF8A5B`/`#FFC542` reserved for streaks, completions, and momentum moments only.
- **Typography:** system stack (`-apple-system, "SF Pro Display", Inter, sans-serif`). **Oversized bold numbers** for streaks, counts, completion %. Sentence case everywhere — never Title Case or ALL CAPS.
- **Motion:** Framer Motion springs (`stiffness ~300, damping ~30`). Animate: cards entering/leaving, the 100→3 "collapse," `layout` transitions on kanban drag, swipe gestures with rubber-banding, and a satisfying check/confetti micro-moment on completion. Respect `prefers-reduced-motion`.

**Life-area color coding** (used for tags, the balance wheel, and board lanes). These are the owner's real areas (see §11 seed data):
Family `#FF6B6B` · Health `#2DD4A7` · Home `#FFB020` · Career `#3B9EFF` · Money `#34D399` · Growth `#A78BFA` · Creative `#F472B6`.

**Interaction grammar (from Google Inbox):** swipe right = complete, swipe left = snooze/reschedule (presents quick options: later today / tomorrow / next week / pick). Long-press = quick actions (edit, delegate, change area). Pull-to-refresh syncs the calendar.

The hero home screen ("the Daily Drive") layout to match: greeting + date + streak → "Today's focus" (3 cards, #1 emphasized, each showing life-area tag, time estimate, and scheduled time) → today's time-blocked schedule (focus blocks visually distinct from calendar events) → "Today's principle" card → workout card → bottom tab bar (Drive · Boards · Calendar · Review).

---

## 5. Information architecture (routes)

- `/` → **Daily Drive** (default home). Today only.
- `/capture` → quick brain-dump (also a global floating + button and a PWA share-target). Type or dictate; multiple items per dump.
- `/boards` → **Kanban** boards (per project and a "by life area" view). Drag-and-drop across Backlog → This week → Doing → Done.
- `/item/[id]` → project/task detail with AI next-action breakdown, subtasks, scheduling, delegation.
- `/calendar` → day + week views; the auto-schedule "Plan my day/week" flow.
- `/review` → weekly review + momentum stats.
- `/areas` → life balance wheel, area targets, principles deck manager, workout plan manager.
- `/onboarding` → connect Google, create/join household, set working hours + energy windows, pick areas, seed principles, first brain-dump import.
- `/settings`, plus auth routes.

---

## 6. Data model (Supabase / Postgres)

Enable RLS on every table. Households are the sharing boundary.

- **profiles** `(id = auth.uid, display_name, avatar_url, household_id, working_hours jsonb, energy_windows jsonb, timezone)`
- **households** `(id, name, created_by, created_at)`
- **household_members** `(household_id, user_id, role: owner|member, joined_at)` — also drives invites.
- **invites** `(id, household_id, email, token, expires_at, accepted_by)`
- **items** `(id, household_id, created_by, assigned_to, title, notes, type: task|project, parent_id, life_area, visibility: private|household, status: inbox|backlog|this_week|doing|done, impact int 1-5, effort_minutes int, due_date, urgency_score, priority_score float, is_next_action bool, position int, created_at, completed_at, source: manual|capture|import)` — projects are `type=project`; their next actions are child `items` with `parent_id` set.
- **schedule_blocks** `(id, item_id, user_id, google_event_id, starts_at, ends_at, status: proposed|accepted|done|skipped)` — links a task to a calendar event.
- **principles** `(id, household_id, author_id, text, active, last_shown_at)`
- **workouts** `(id, user_id, scheduled_for, name, exercises jsonb, completed_at)`
- **reviews** `(id, household_id, user_id, week_start, stats jsonb, reflection text)`
- **google_accounts** `(user_id, google_sub, access_token, refresh_token, token_expiry, scopes)` — **server-access only**, never exposed to the client.

RLS rules: a user can read/write household items where they're a member; `private` items are visible only to `created_by`; `google_accounts`, tokens, and per-user workouts are owner-only.

---

## 7. The 10 features (build specs)

Each must reach the acceptance bar listed.

1. **Daily Drive (home).** Pulls the top 3 ranked, schedulable items for *today* + today's blocks + one principle + today's workout. Never renders the full backlog. *Done when:* opening the app shows exactly today's plan and a "you have N resting" count, nothing more.

2. **Frictionless capture + AI triage.** A fast inbox: free-text or voice, multiple items at once. On submit, send to the triage route (§8) and auto-fill area/type/effort/urgency, landing items in `inbox`/`backlog`. *Done when:* a 10-line brain dump becomes 10 categorized, estimated items in one action, editable inline.

3. **Auto-prioritization engine.** Compute `priority_score` per item from impact, urgency (due-date proximity), effort (shorter ties break upward to build momentum), and a **balance multiplier** that boosts neglected life areas (derived from recent completions vs. area targets). Re-rank on any change. *Done when:* the ranked queue is stable, explainable ("ranked high because: due soon · high impact · Family is behind"), and the Daily Drive's "Today's 3" come from the top of it.

4. **Next-action breakdown.** For any `project`, the detail screen offers "Break this down" → AI returns ordered, concrete child tasks each with a verb + an effort estimate; the single most actionable one is flagged `is_next_action` and surfaces to the Drive. *Done when:* "Renovate garage" yields steps like "Measure garage — 15 min" and only the next action competes for today.

5. **Smart calendar sync + auto-scheduling.** Two-way Google Calendar (§8). "Plan my day/week" finds free slots from real events + working hours/energy windows, places top tasks as time-boxed **focus blocks**, and shows a proposed plan the user can drag/edit, then **accept** to write events back. Completing/rescheduling a task updates or removes its event. *Done when:* accepting a plan creates real Google Calendar events that appear in both Life Drive and Google Calendar, and edits stay in sync.

6. **Kanban project boards.** Drag-and-drop lanes (Backlog → This week → Doing → Done) with Framer Motion `layout` animations; filter by project or life area; moving a card to "This week" makes it eligible for scheduling. Realtime so family members see moves live. *Done when:* drag persists position + status and syncs across two logged-in devices.

7. **Life balance wheel.** A radial visualization of investment across the six areas (based on recent completions/time blocked vs. user-set targets); feeds the balance multiplier in feature 3 and links to the area's filtered board. *Done when:* neglecting an area visibly dims its spoke and nudges its tasks up the queue.

8. **Daily principles + movement.** Surfaces one principle/day from the household deck (rotates, avoids repeats via `last_shown_at`) and the day's workout with one-tap complete. Both editable in `/areas`. *Done when:* the Drive shows a fresh principle daily and the workout card marks done with a satisfying micro-animation.

9. **Weekly review & momentum.** A Sunday (configurable) screen: items shipped, completion %, streaks, balance-wheel delta, and an auto re-rank/"set up next week" action that pulls candidates into This week. *Done when:* the review summarizes the real week and one tap stages next week's board.

10. **Family shared lanes + delegation.** Household creation + email invites; assign any item to a member (`assigned_to`), a merged household calendar overlay, and per-member filters. Respect `visibility=private`. *Done when:* an owner can invite a member, delegate a task, and both see it live with correct permissions.

---

## 8. Integrations (exact contracts)

### Google Calendar (two-way)
- OAuth 2.0 with **offline access** to obtain a refresh token; scopes: `calendar.readonly` (read events to find free time) and `calendar.events` (create/update/delete Life Drive focus blocks). Store tokens in `google_accounts`, **server-side only**; refresh on expiry.
- Server routes: `listEvents(timeMin,timeMax)`, `createEvent(block)`, `updateEvent`, `deleteEvent`. Tag created events (e.g. extended property `lifeDrive=true` + `itemId`) so Life Drive only ever edits its own events and never touches the user's real meetings.
- **Auto-schedule algorithm:** (a) fetch the day's/week's busy intervals; (b) subtract from the user's working hours to get free slots; (c) walk the ranked queue, placing each task into the earliest slot that fits its `effort_minutes`, **prioritizing deep-focus/high-priority tasks into the owner's seeded focus windows (6:00–7:00 and 10:00–12:00, America/Denver)** before filling other free time, adding a short buffer between blocks, and never double-booking; (d) emit `proposed` `schedule_blocks`; (e) on user **accept**, write Google events and flip to `accepted`. Always propose, never silently write.

### Anthropic API (server-side only — never expose the key)
Use the Messages API. Default reasoning model **`claude-sonnet-4-6`**; use **`claude-haiku-4-5-20251001`** for the high-volume/cheap triage classification; reserve **`claude-opus-4-7`** for heavy planning if needed. Make the model an env var (`ANTHROPIC_MODEL_*`). Instruct the model to return **strict JSON only** (no prose, no markdown fences) and parse defensively.

- **Triage** (`POST /api/triage`, Haiku): input `{ rawText }` → output an array of `{ title, life_area, type: "task"|"project", effort_minutes, urgency: 1-5, suggested_due_date|null, is_next_action }`.
- **Prioritize/explain** (Sonnet): given the candidate set + area-balance context, return a short human-readable reason string per top item for the "ranked high because…" line. (The numeric score is computed in code; the LLM only explains.)
- **Decompose** (`POST /api/decompose`, Sonnet): input a project `{ title, notes }` → output ordered `{ steps: [{ title, effort_minutes }], next_action_index }`.

---

## 9. Security & privacy guardrails (non-negotiable)

- Never ship the Anthropic key or Google tokens to the client; all such calls go through server routes/Edge Functions.
- RLS on every table; verify household membership server-side on every mutation.
- The calendar planner **proposes**; it only writes/deletes events after explicit user acceptance, and only events it created (tagged).
- Optimistic UI for snappy feel, but reconcile against the server; queue offline mutations and replay on reconnect.
- Round every displayed number; handle empty/error/loading states for every async surface.

---

## 10. Build order (milestones — commit after each)

1. **Scaffold + design system.** Next.js + TS + Tailwind + Framer Motion + PWA shell. Build the glass primitives and render the Daily Drive with mock data so the aesthetic is locked first.
2. **Auth + households.** Supabase auth, profile, create/join household, invites, RLS.
3. **Items CRUD + boards.** Kanban with drag/persist + realtime.
4. **Seed real data.** Run an idempotent seed script that loads `life-drive-seed-data.json` (see §11) into the schema — areas, principles, workout split, goals, projects + subtasks, tasks, vision, values, resources. After this milestone the app is populated with the owner's actual life, not placeholders.
5. **Capture + AI triage** route.
6. **Prioritization engine** + wire Daily Drive's "Today's 3" to real ranked data.
7. **Project decomposition / next actions.**
8. **Google Calendar OAuth + read** (day/week views).
9. **Auto-scheduling + write-back.**
10. **Balance wheel + principles + workouts.**
11. **Weekly review + momentum**, then delegation/sharing polish and PWA install/offline hardening.

## Definition of done

A family member can install Life Drive to their home screen, brain-dump 30 tasks, watch them get categorized and ranked, tap "Plan my day," accept a schedule that lands real focus blocks in their Google Calendar, complete tasks with a swipe, and on Sunday see what they shipped — all while the home screen never shows more than today. It should feel like a premium, calm, slightly addictive native app, not a web form.

---

## 11. Seed data (real user content — load on first run)

Ship `life-drive-seed-data.json` (provided alongside this prompt) and load it with an **idempotent seed script** (re-running must not duplicate). It contains the owner's actual content, already structured to the schema:

- `life_areas` — the seven real areas with colors and weekly target %. Use these exact areas/colors instead of generic defaults.
- `principles` — ~60 curated life lessons grouped by the owner's themes (meaning & success, action & consistency, health & bliss). Seed each as a `principles` row; the Daily Drive surfaces one/day, rotating without recent repeats.
- `workout_split` — a recurring 7-day split (Push/Pull/Legs + Sunday recovery) with exercises. Seed as recurring `workouts` keyed by day-of-week and regenerate weekly; the Drive shows the day's session with one-tap complete.
- `goals_2026` — health and finance goals with measurable targets; seed as top-level projects whose progress feeds the balance wheel and weekly review.
- `projects` — ~22 multi-step projects (kitchen remodel, garage remodel, patio/barn build, vehicle repairs, Nova passport/citizenship, photo/document sorting, Travelfire rebuild, etc.). Each has `area`, an `effort_minutes` estimate, a `next_step`, and `subtasks`. Seed as `type=project` items with child `items`; set the `next_step` child (or the project itself) as `is_next_action`.
- `tasks` — ~55 single-action items with inferred `area` + `effort_minutes`. Seed as `type=task`, `status=backlog`.
- `vision_2030` — long-horizon items (incl. the "BASE CAMP" dream build); keep in a "Someday / 5-year" lane, excluded from the daily queue but visible on boards.
- `owner_profile` — timezone (America/Denver), working hours (6am–9pm), and two seeded deep-focus windows (6–7am, 10am–12pm). The auto-scheduler fills these windows with the highest-priority/deep-work tasks first.
- `values` — the owner's "do more / do less" lists; display in `/areas` and optionally drive gentle habit nudges (not tasks).
- `watchlist_movies` and `resources` — a movie watchlist and external Notion links; surface as light reference content (e.g. a "Resources" tab), not in the task queue.

Notes for the seed:
- Areas, effort estimates, and task/project typing for the loose items were inferred from the owner's dump and must remain **user-editable** — treat them as a starting point, not ground truth.
- Create the household (`Home base`) with the two adults (Markus, Sarah) as members; everything seeded belongs to that household with `visibility=household` unless obviously personal.
- Several items reference real accounts, properties, and family documents. Keep this data inside the user's own database only; never send it to third parties or include it in logs/analytics.
