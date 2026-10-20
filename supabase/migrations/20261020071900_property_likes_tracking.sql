-- Keep one active like per visitor and property, plus an immutable activity log.
create table if not exists public.property_likes (
  visitor_id uuid not null,
  property_id integer not null references public.properties(id) on delete cascade,
  property_type public.property_type not null,
  liked_at timestamptz not null default clock_timestamp(),
  primary key (visitor_id, property_id)
);

create index if not exists idx_property_likes_property_id
  on public.property_likes (property_id, liked_at desc);

create table if not exists public.property_like_events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  property_id integer not null references public.properties(id) on delete cascade,
  property_type public.property_type not null,
  action text not null check (action in ('like', 'unlike')),
  occurred_at timestamptz not null default clock_timestamp()
);

create index if not exists idx_property_like_events_property_time
  on public.property_like_events (property_id, occurred_at desc, id desc);

create index if not exists idx_property_like_events_visitor
  on public.property_like_events (visitor_id, property_id, occurred_at desc);

alter table public.property_likes enable row level security;
alter table public.property_like_events enable row level security;

revoke all on public.property_likes from public, anon, authenticated;
revoke all on public.property_like_events from public, anon, authenticated;
grant select, insert, delete on public.property_likes to service_role;
grant select, insert on public.property_like_events to service_role;
revoke all on sequence public.property_like_events_id_seq from public, anon, authenticated;
grant usage, select on sequence public.property_like_events_id_seq to service_role;

-- The service-role-only endpoint calls this idempotent state transition. The
-- per-visitor/property advisory lock prevents rapid double-click races from
-- creating duplicate events or leaving a stale active state.
create or replace function public.set_property_like(
  p_property_id integer,
  p_visitor_id uuid,
  p_is_liked boolean
)
returns table (is_liked boolean, like_count bigint, changed boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_property_type public.property_type;
  v_currently_liked boolean;
  v_like_count bigint;
  v_changed boolean := false;
begin
  if p_property_id is null or p_property_id <= 0 or p_visitor_id is null or p_is_liked is null then
    raise exception 'Invalid property like request' using errcode = '22023';
  end if;

  select p.property_type
  into v_property_type
  from public.properties as p
  where p.id = p_property_id;

  if not found then
    raise exception 'Property not found' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_visitor_id::text || ':' || p_property_id::text, 0)
  );

  select exists (
    select 1
    from public.property_likes as l
    where l.visitor_id = p_visitor_id and l.property_id = p_property_id
  ) into v_currently_liked;

  if p_is_liked and not v_currently_liked then
    insert into public.property_likes (visitor_id, property_id, property_type)
    values (p_visitor_id, p_property_id, v_property_type);

    insert into public.property_like_events (visitor_id, property_id, property_type, action)
    values (p_visitor_id, p_property_id, v_property_type, 'like');
    v_changed := true;
  elsif not p_is_liked and v_currently_liked then
    delete from public.property_likes as l
    where l.visitor_id = p_visitor_id and l.property_id = p_property_id;

    insert into public.property_like_events (visitor_id, property_id, property_type, action)
    values (p_visitor_id, p_property_id, v_property_type, 'unlike');
    v_changed := true;
  end if;

  select count(*)
  into v_like_count
  from public.property_likes as l
  where l.property_id = p_property_id;

  return query select p_is_liked, v_like_count, v_changed;
end;
$$;

revoke all on function public.set_property_like(integer, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_property_like(integer, uuid, boolean) to service_role;

create or replace function public.admin_property_like_summary()
returns table (
  property_id integer,
  property_type public.property_type,
  like_count bigint,
  latest_liked_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.property_id, l.property_type, count(*)::bigint, max(l.liked_at)
  from public.property_likes as l
  group by l.property_id, l.property_type
  order by count(*) desc, max(l.liked_at) desc, l.property_id asc
$$;

revoke all on function public.admin_property_like_summary() from public, anon, authenticated;
grant execute on function public.admin_property_like_summary() to service_role;
