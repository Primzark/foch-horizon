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
  with ever_liked as (
    select
      e.property_id,
      e.property_type,
      max(e.occurred_at) filter (where e.action = 'like') as latest_liked_at
    from public.property_like_events as e
    group by e.property_id, e.property_type
    having bool_or(e.action = 'like')
  ),
  active_likes as (
    select l.property_id, l.property_type, count(*)::bigint as like_count
    from public.property_likes as l
    group by l.property_id, l.property_type
  )
  select
    history.property_id,
    history.property_type,
    coalesce(active.like_count, 0)::bigint,
    history.latest_liked_at
  from ever_liked as history
  left join active_likes as active
    on active.property_id = history.property_id
   and active.property_type = history.property_type
  order by coalesce(active.like_count, 0) desc, history.latest_liked_at desc, history.property_id asc
$$;
