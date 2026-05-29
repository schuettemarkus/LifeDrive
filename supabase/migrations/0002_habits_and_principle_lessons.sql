-- Habits: daily repeating rituals shown under Today's Focus on the Drive.
-- Per-user; tied to a household for tenancy so household members can see counts but each picks their own habits.

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  life_area text,
  -- Sun=0, Mon=1, ... Sat=6. Daily habit = {0,1,2,3,4,5,6}.
  days_of_week smallint[] not null default array[0,1,2,3,4,5,6],
  -- Optional cue for when to do it.
  time_of_day text check (time_of_day in ('morning', 'midday', 'evening', 'anytime')) default 'anytime',
  -- Optional emoji prefix, lets the user personalize.
  icon text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_active_idx on public.habits (user_id, active);
create index if not exists habits_household_idx on public.habits (household_id);

drop trigger if exists habits_touch on public.habits;
create trigger habits_touch before update on public.habits
for each row execute function public.touch_updated_at();

-- Per-day completion log. One row per (habit_id, completed_on).
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_on date not null,
  completed_at timestamptz not null default now(),
  unique (habit_id, completed_on)
);

create index if not exists habit_completions_habit_idx on public.habit_completions (habit_id, completed_on desc);
create index if not exists habit_completions_user_date_idx on public.habit_completions (user_id, completed_on desc);

------------------------------------------------------------
-- RLS
------------------------------------------------------------
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

drop policy if exists habits_select on public.habits;
create policy habits_select on public.habits
for select using (user_id = auth.uid());

drop policy if exists habits_modify on public.habits;
create policy habits_modify on public.habits
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists habit_completions_select on public.habit_completions;
create policy habit_completions_select on public.habit_completions
for select using (user_id = auth.uid());

drop policy if exists habit_completions_modify on public.habit_completions;
create policy habit_completions_modify on public.habit_completions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

------------------------------------------------------------
-- realtime
------------------------------------------------------------
alter publication supabase_realtime add table public.habits;
alter publication supabase_realtime add table public.habit_completions;

------------------------------------------------------------
-- principles: cache AI-generated micro-lessons.
------------------------------------------------------------
alter table public.principles add column if not exists lesson text;
alter table public.principles add column if not exists lesson_generated_at timestamptz;
