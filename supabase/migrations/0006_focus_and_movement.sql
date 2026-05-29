-- ─────────────────────────────────────────────────────────────────────────────
-- 0006_focus_and_movement.sql
--
-- Adds:
--   • daily_focus  — per-user lock of "today's three" so completions don't
--                    silently backfill. Picks are computed once per day,
--                    persisted, then UI filters out completed ones.
--   • movement     — per-day movement log (Workout / Pickleball / Stretch /
--                    Walk / Yard Work / Bike / Other) for pattern discovery.
--
-- Also clears the cached lesson text on existing principles so the next
-- expand triggers the new "principle summary" prompt.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── daily_focus ─────────────────────────────────────────────────────────────
create table if not exists public.daily_focus (
  user_id      uuid       not null references auth.users(id) on delete cascade,
  household_id uuid       not null references public.households(id) on delete cascade,
  day          date       not null,
  item_ids     uuid[]     not null default '{}',
  created_at   timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists daily_focus_user_idx on public.daily_focus (user_id, day desc);

alter table public.daily_focus enable row level security;

drop policy if exists daily_focus_select on public.daily_focus;
create policy daily_focus_select on public.daily_focus
for select using (user_id = auth.uid());

drop policy if exists daily_focus_modify on public.daily_focus;
create policy daily_focus_modify on public.daily_focus
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── movement_logs ───────────────────────────────────────────────────────────
do $$ begin
  create type public.movement_kind as enum (
    'workout','pickleball','stretch','walk','yard_work','bike','other'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.movement_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  day           date not null default (now() at time zone 'utc')::date,
  kind          public.movement_kind not null,
  custom_label  text,
  notes         text,
  duration_min  int,
  created_at    timestamptz not null default now()
);

create index if not exists movement_logs_user_day_idx on public.movement_logs (user_id, day desc);
create index if not exists movement_logs_user_kind_idx on public.movement_logs (user_id, kind);

alter table public.movement_logs enable row level security;

drop policy if exists movement_logs_select on public.movement_logs;
create policy movement_logs_select on public.movement_logs
for select using (user_id = auth.uid());

drop policy if exists movement_logs_modify on public.movement_logs;
create policy movement_logs_modify on public.movement_logs
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── clear stale lesson cache (so new "summary" prompt is used on next view) ─
update public.principles
  set lesson = null,
      lesson_generated_at = null
  where lesson is not null;
