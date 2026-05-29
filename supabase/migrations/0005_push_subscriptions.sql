-- Web Push subscriptions. One per browser/device per user.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  morning_briefing boolean not null default true,
  evening_review boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_select on public.push_subscriptions;
create policy push_select on public.push_subscriptions
for select using (user_id = auth.uid());

drop policy if exists push_modify on public.push_subscriptions;
create policy push_modify on public.push_subscriptions
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists push_subscriptions_touch on public.push_subscriptions;
create trigger push_subscriptions_touch before update on public.push_subscriptions
for each row execute function public.touch_updated_at();
