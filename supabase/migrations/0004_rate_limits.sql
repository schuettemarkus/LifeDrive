-- AI rate-limit ledger. Per-user usage rolling counters across a 24h window.
-- Service-role-only access; clients can't read or write directly.

create table if not exists public.ai_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,             -- 'triage' | 'decompose' | 'lesson' | 'prioritize_reason'
  model text,                          -- the actual claude model used
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);
create index if not exists ai_usage_user_endpoint_idx on public.ai_usage (user_id, endpoint, created_at desc);

alter table public.ai_usage enable row level security;
-- Clients can read their own usage (for showing remaining quota), but not write.
drop policy if exists ai_usage_select on public.ai_usage;
create policy ai_usage_select on public.ai_usage
for select using (user_id = auth.uid());
drop policy if exists ai_usage_no_write on public.ai_usage;
create policy ai_usage_no_write on public.ai_usage
for all using (false) with check (false);

-- Helper: count calls in the last N minutes for an (endpoint).
create or replace function public.ai_calls_in_window(
  p_user_id uuid,
  p_endpoint text,
  p_minutes int
) returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.ai_usage
  where user_id = p_user_id
    and (p_endpoint = '*' or endpoint = p_endpoint)
    and created_at > now() - make_interval(mins => p_minutes);
$$;
