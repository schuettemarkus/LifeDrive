-- Daily activity log. A user's day counts as 'active' if they completed
-- anything (item, habit, or workout). Streaks are derived from consecutive
-- active days, computed via a security-definer function so the client never
-- needs to send raw queries to compute streaks.

create table if not exists public.daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  items_completed int not null default 0,
  habits_completed int not null default 0,
  workouts_completed int not null default 0,
  first_action_at timestamptz,
  last_action_at timestamptz,
  primary key (user_id, day)
);

create index if not exists daily_activity_user_day_idx on public.daily_activity (user_id, day desc);

alter table public.daily_activity enable row level security;

drop policy if exists daily_activity_select on public.daily_activity;
create policy daily_activity_select on public.daily_activity
for select using (user_id = auth.uid());

-- No client writes; activity is recorded by server-side triggers + service role.
drop policy if exists daily_activity_no_write on public.daily_activity;
create policy daily_activity_no_write on public.daily_activity
for all using (false) with check (false);

------------------------------------------------------------
-- record_activity() — service-definer helper. Bumps the right counter
-- for today's row. Called by triggers below.
------------------------------------------------------------
create or replace function public.record_activity(
  p_user_id uuid,
  p_kind text  -- 'item' | 'habit' | 'workout'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_now timestamptz := now();
begin
  insert into public.daily_activity (
    user_id, day,
    items_completed, habits_completed, workouts_completed,
    first_action_at, last_action_at
  ) values (
    p_user_id, v_today,
    case when p_kind = 'item' then 1 else 0 end,
    case when p_kind = 'habit' then 1 else 0 end,
    case when p_kind = 'workout' then 1 else 0 end,
    v_now, v_now
  )
  on conflict (user_id, day) do update set
    items_completed   = daily_activity.items_completed
                        + case when p_kind = 'item' then 1 else 0 end,
    habits_completed  = daily_activity.habits_completed
                        + case when p_kind = 'habit' then 1 else 0 end,
    workouts_completed = daily_activity.workouts_completed
                        + case when p_kind = 'workout' then 1 else 0 end,
    last_action_at = v_now;
end;
$$;

------------------------------------------------------------
-- Triggers: items.completed_at, habit_completions insert, workouts.completed_at.
------------------------------------------------------------
create or replace function public.on_item_completed() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.completed_at is not null)
     or (tg_op = 'UPDATE' and (old.completed_at is distinct from new.completed_at) and new.completed_at is not null) then
    perform public.record_activity(
      coalesce(new.assigned_to, new.created_by),
      'item'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_item_completed on public.items;
create trigger on_item_completed
after insert or update of completed_at on public.items
for each row execute function public.on_item_completed();

create or replace function public.on_habit_completion() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.record_activity(new.user_id, 'habit');
  return new;
end;
$$;

drop trigger if exists on_habit_completion on public.habit_completions;
create trigger on_habit_completion
after insert on public.habit_completions
for each row execute function public.on_habit_completion();

create or replace function public.on_workout_completed() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.completed_at is not null)
     or (tg_op = 'UPDATE' and (old.completed_at is distinct from new.completed_at) and new.completed_at is not null) then
    perform public.record_activity(new.user_id, 'workout');
  end if;
  return new;
end;
$$;

drop trigger if exists on_workout_completed on public.workouts;
create trigger on_workout_completed
after insert or update of completed_at on public.workouts
for each row execute function public.on_workout_completed();

------------------------------------------------------------
-- get_streak(user_id) — returns consecutive active days ending today (or
-- yesterday if today is still in progress). 'In progress' means today has
-- no activity yet but yesterday did — we don't break the streak until
-- the user goes a full day without activity.
------------------------------------------------------------
create or replace function public.get_streak(p_user_id uuid)
returns table (
  streak int,
  today_active boolean,
  last_active date,
  total_active_days int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_cursor date;
  v_streak int := 0;
  v_last_active date;
  v_total int;
  v_today_active boolean := false;
begin
  select count(*) into v_total from public.daily_activity where user_id = p_user_id;
  if v_total = 0 then
    return query select 0, false, null::date, 0;
    return;
  end if;

  select max(day) into v_last_active from public.daily_activity where user_id = p_user_id;

  v_today_active := exists (
    select 1 from public.daily_activity where user_id = p_user_id and day = v_today
  );

  -- Start at today if active, else yesterday. Anything earlier and the streak is 0.
  v_cursor := case
    when v_today_active then v_today
    when v_last_active = v_today - 1 then v_today - 1
    else null
  end;

  while v_cursor is not null and exists (
    select 1 from public.daily_activity where user_id = p_user_id and day = v_cursor
  ) loop
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return query select v_streak, v_today_active, v_last_active, v_total::int;
end;
$$;

-- Backfill: scan existing completions and rebuild daily_activity. Idempotent —
-- truncating and re-inserting from the source tables.
truncate public.daily_activity;

insert into public.daily_activity (user_id, day, items_completed, first_action_at, last_action_at)
select
  coalesce(assigned_to, created_by) as user_id,
  (timezone('utc', completed_at))::date as day,
  count(*),
  min(completed_at),
  max(completed_at)
from public.items
where completed_at is not null and coalesce(assigned_to, created_by) is not null
group by 1, 2
on conflict (user_id, day) do nothing;

insert into public.daily_activity (user_id, day, habits_completed, first_action_at, last_action_at)
select user_id, completed_on, count(*), min(completed_at), max(completed_at)
from public.habit_completions
group by 1, 2
on conflict (user_id, day) do update set
  habits_completed = excluded.habits_completed,
  first_action_at = least(public.daily_activity.first_action_at, excluded.first_action_at),
  last_action_at = greatest(public.daily_activity.last_action_at, excluded.last_action_at);

insert into public.daily_activity (user_id, day, workouts_completed, first_action_at, last_action_at)
select user_id, (timezone('utc', completed_at))::date, count(*), min(completed_at), max(completed_at)
from public.workouts
where completed_at is not null
group by 1, 2
on conflict (user_id, day) do update set
  workouts_completed = excluded.workouts_completed,
  first_action_at = least(public.daily_activity.first_action_at, excluded.first_action_at),
  last_action_at = greatest(public.daily_activity.last_action_at, excluded.last_action_at);
