-- Life Drive schema
-- Households are the sharing boundary. RLS is enabled on every table.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

------------------------------------------------------------
-- enums
------------------------------------------------------------
do $$ begin
  create type item_type as enum ('task', 'project');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_status as enum ('inbox', 'backlog', 'this_week', 'doing', 'done', 'someday');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_visibility as enum ('private', 'household');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_source as enum ('manual', 'capture', 'import', 'seed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type schedule_status as enum ('proposed', 'accepted', 'done', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type household_role as enum ('owner', 'member');
exception when duplicate_object then null; end $$;

------------------------------------------------------------
-- households
------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  household_id uuid references public.households(id) on delete set null,
  working_hours jsonb not null default '{"start":"06:00","end":"21:00"}'::jsonb,
  focus_windows jsonb not null default
    '[{"start":"06:00","end":"07:00","label":"Early morning deep work"},
      {"start":"10:00","end":"12:00","label":"Late-morning deep work"}]'::jsonb,
  energy_windows jsonb not null default '[]'::jsonb,
  timezone text not null default 'America/Denver',
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role household_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

------------------------------------------------------------
-- items
------------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  notes text,
  type item_type not null default 'task',
  parent_id uuid references public.items(id) on delete cascade,
  life_area text,
  visibility item_visibility not null default 'household',
  status item_status not null default 'inbox',
  impact smallint not null default 3 check (impact between 1 and 5),
  urgency smallint not null default 3 check (urgency between 1 and 5),
  effort_minutes integer,
  due_date date,
  urgency_score double precision not null default 0,
  priority_score double precision not null default 0,
  priority_reason text,
  is_next_action boolean not null default false,
  position integer not null default 0,
  source item_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists items_household_status_idx on public.items (household_id, status);
create index if not exists items_household_area_idx on public.items (household_id, life_area);
create index if not exists items_assigned_idx on public.items (assigned_to);
create index if not exists items_parent_idx on public.items (parent_id);
create index if not exists items_priority_idx on public.items (household_id, priority_score desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists items_touch on public.items;
create trigger items_touch before update on public.items
for each row execute function public.touch_updated_at();

------------------------------------------------------------
-- schedule_blocks (link a task to a calendar event)
------------------------------------------------------------
create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  google_event_id text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status schedule_status not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedule_user_range_idx on public.schedule_blocks (user_id, starts_at);
create index if not exists schedule_item_idx on public.schedule_blocks (item_id);

drop trigger if exists schedule_touch on public.schedule_blocks;
create trigger schedule_touch before update on public.schedule_blocks
for each row execute function public.touch_updated_at();

------------------------------------------------------------
-- principles
------------------------------------------------------------
create table if not exists public.principles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  text text not null,
  theme text,
  active boolean not null default true,
  last_shown_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, text)
);

create index if not exists principles_household_active_idx on public.principles (household_id, active);

------------------------------------------------------------
-- workouts (recurring weekly split)
------------------------------------------------------------
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),
  scheduled_for date,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, scheduled_for)
);

create index if not exists workouts_user_day_idx on public.workouts (user_id, day_of_week);

------------------------------------------------------------
-- reviews (weekly)
------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  stats jsonb not null default '{}'::jsonb,
  reflection text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

------------------------------------------------------------
-- google_accounts (server-only)
------------------------------------------------------------
create table if not exists public.google_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_sub text not null,
  access_token text not null,
  refresh_token text not null,
  token_expiry timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists google_accounts_touch on public.google_accounts;
create trigger google_accounts_touch before update on public.google_accounts
for each row execute function public.touch_updated_at();

------------------------------------------------------------
-- membership helper (security definer to dodge RLS recursion)
------------------------------------------------------------
create or replace function public.is_member_of(p_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = p_household and user_id = auth.uid()
  );
$$;

------------------------------------------------------------
-- RLS
------------------------------------------------------------
alter table public.households          enable row level security;
alter table public.profiles            enable row level security;
alter table public.household_members   enable row level security;
alter table public.invites             enable row level security;
alter table public.items               enable row level security;
alter table public.schedule_blocks     enable row level security;
alter table public.principles          enable row level security;
alter table public.workouts            enable row level security;
alter table public.reviews             enable row level security;
alter table public.google_accounts     enable row level security;

-- households
drop policy if exists households_select on public.households;
create policy households_select on public.households
for select using (public.is_member_of(id));

drop policy if exists households_insert on public.households;
create policy households_insert on public.households
for insert with check (created_by = auth.uid());

drop policy if exists households_update on public.households;
create policy households_update on public.households
for update using (
  exists (
    select 1 from public.household_members m
    where m.household_id = id and m.user_id = auth.uid() and m.role = 'owner'
  )
) with check (true);

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (
  id = auth.uid()
  or (household_id is not null and public.is_member_of(household_id))
);

drop policy if exists profiles_upsert on public.profiles;
create policy profiles_upsert on public.profiles
for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- household_members
drop policy if exists hm_select on public.household_members;
create policy hm_select on public.household_members
for select using (public.is_member_of(household_id));

drop policy if exists hm_insert on public.household_members;
create policy hm_insert on public.household_members
for insert with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.household_members m
    where m.household_id = household_id and m.user_id = auth.uid() and m.role = 'owner'
  )
);

drop policy if exists hm_delete on public.household_members;
create policy hm_delete on public.household_members
for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.household_members m
    where m.household_id = household_id and m.user_id = auth.uid() and m.role = 'owner'
  )
);

-- invites
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
for select using (
  public.is_member_of(household_id)
  or accepted_by = auth.uid()
);

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites
for insert with check (
  exists (
    select 1 from public.household_members m
    where m.household_id = household_id and m.user_id = auth.uid() and m.role = 'owner'
  )
);

drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites
for update using (
  public.is_member_of(household_id) or true  -- token-based accept happens via service role
) with check (true);

-- items
drop policy if exists items_select on public.items;
create policy items_select on public.items
for select using (
  public.is_member_of(household_id)
  and (visibility = 'household' or created_by = auth.uid())
);

drop policy if exists items_insert on public.items;
create policy items_insert on public.items
for insert with check (
  public.is_member_of(household_id)
  and (created_by = auth.uid() or created_by is null)
);

drop policy if exists items_update on public.items;
create policy items_update on public.items
for update using (
  public.is_member_of(household_id)
  and (visibility = 'household' or created_by = auth.uid())
) with check (public.is_member_of(household_id));

drop policy if exists items_delete on public.items;
create policy items_delete on public.items
for delete using (
  public.is_member_of(household_id)
  and (visibility = 'household' or created_by = auth.uid())
);

-- schedule_blocks (per-user)
drop policy if exists sb_select on public.schedule_blocks;
create policy sb_select on public.schedule_blocks
for select using (user_id = auth.uid());

drop policy if exists sb_modify on public.schedule_blocks;
create policy sb_modify on public.schedule_blocks
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- principles (household)
drop policy if exists principles_select on public.principles;
create policy principles_select on public.principles
for select using (public.is_member_of(household_id));

drop policy if exists principles_modify on public.principles;
create policy principles_modify on public.principles
for all using (public.is_member_of(household_id)) with check (public.is_member_of(household_id));

-- workouts (per-user)
drop policy if exists workouts_select on public.workouts;
create policy workouts_select on public.workouts
for select using (user_id = auth.uid());

drop policy if exists workouts_modify on public.workouts;
create policy workouts_modify on public.workouts
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reviews (per-user)
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
for select using (user_id = auth.uid());

drop policy if exists reviews_modify on public.reviews;
create policy reviews_modify on public.reviews
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- google_accounts: deny client access entirely. Service-role bypasses RLS.
drop policy if exists ga_no_select on public.google_accounts;
create policy ga_no_select on public.google_accounts for select using (false);

------------------------------------------------------------
-- realtime
------------------------------------------------------------
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.schedule_blocks;
alter publication supabase_realtime add table public.principles;
alter publication supabase_realtime add table public.workouts;

------------------------------------------------------------
-- on new auth user: ensure profile row
------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
