begin;

-- Lead records must only be written by the server-side submission function.
drop policy if exists public_insert_leads on public.leads;
revoke insert on table public.leads from public, anon, authenticated;

-- A small server-only table backs atomic per-IP limits for public Edge Functions.
create table if not exists public.api_rate_limits (
  scope text not null check (char_length(scope) between 1 and 64),
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 1),
  primary key (scope, key_hash)
);

create index if not exists api_rate_limits_window_started_at_idx
  on public.api_rate_limits (window_started_at);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from public, anon, authenticated;
grant all on table public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_scope is null or char_length(p_scope) < 1 or char_length(p_scope) > 64
     or p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit is null or p_window_seconds is null
     or p_limit < 1 or p_limit > 10000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.api_rate_limits as current_limit
    (scope, key_hash, window_started_at, request_count)
  values
    (p_scope, p_key_hash, v_now, 1)
  on conflict (scope, key_hash) do update
    set window_started_at = case
          when current_limit.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
            then v_now
          else current_limit.window_started_at
        end,
        request_count = case
          when current_limit.window_started_at <= v_now - pg_catalog.make_interval(secs => p_window_seconds)
            then 1
          else current_limit.request_count + 1
        end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;

commit;
