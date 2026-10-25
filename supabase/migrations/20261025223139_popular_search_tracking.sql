begin;

-- Keep only aggregate counts for allowlisted, coarse search facets.
create table if not exists public.search_popularity_daily (
  search_key text not null check (search_key ~ '^(location|type|feature):[a-z0-9_-]{1,48}$'),
  search_day date not null default current_date,
  search_count integer not null default 1 check (search_count >= 1),
  primary key (search_key, search_day)
);

create index if not exists search_popularity_daily_search_day_idx
  on public.search_popularity_daily (search_day);

alter table public.search_popularity_daily enable row level security;
revoke all on table public.search_popularity_daily from public, anon, authenticated;
grant all on table public.search_popularity_daily to service_role;

create or replace function public.record_search_popularity(p_search_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_search_key is null
     or p_search_key !~ '^(location|type|feature):[a-z0-9_-]{1,48}$' then
    raise exception 'Invalid search key';
  end if;

  insert into public.search_popularity_daily as daily
    (search_key, search_day, search_count)
  values
    (p_search_key, current_date, 1)
  on conflict (search_key, search_day) do update
    set search_count = daily.search_count + 1;

  delete from public.search_popularity_daily
  where search_day < current_date - 89;
end;
$$;

revoke all on function public.record_search_popularity(text) from public, anon, authenticated;
grant execute on function public.record_search_popularity(text) to service_role;

commit;
