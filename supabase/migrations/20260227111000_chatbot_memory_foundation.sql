-- Gemini Max foundation: persistent structured memory (privacy-friendly)

create table if not exists chatbot_memory_sessions (
  session_id text primary key,
  last_seen_at timestamptz not null default now(),
  memory_version text not null default 'v1',
  summary text,
  preferences jsonb not null default '{}'::jsonb,
  qualification jsonb not null default '{}'::jsonb,
  selected_property_ids jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chatbot_memory_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references chatbot_memory_sessions(session_id) on delete cascade,
  event_type text not null default 'memory_merge',
  delta jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chatbot_memory_sessions_last_seen_at
  on chatbot_memory_sessions(last_seen_at desc);
create index if not exists idx_chatbot_memory_sessions_updated_at
  on chatbot_memory_sessions(updated_at desc);
create index if not exists idx_chatbot_memory_events_session_id
  on chatbot_memory_events(session_id);
create index if not exists idx_chatbot_memory_events_created_at
  on chatbot_memory_events(created_at desc);

alter table chatbot_memory_sessions enable row level security;
alter table chatbot_memory_events enable row level security;

drop policy if exists service_role_all_chatbot_memory_sessions on chatbot_memory_sessions;
create policy service_role_all_chatbot_memory_sessions
  on chatbot_memory_sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists service_role_all_chatbot_memory_events on chatbot_memory_events;
create policy service_role_all_chatbot_memory_events
  on chatbot_memory_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace view chatbot_memory_daily as
select
  coalesce(
    date_trunc('day', e.created_at)::date,
    date_trunc('day', s.updated_at)::date
  ) as day,
  count(distinct s.session_id) as sessions_touched,
  count(e.id) as memory_events,
  avg(jsonb_array_length(s.selected_property_ids)) filter (where jsonb_typeof(s.selected_property_ids) = 'array')
    as avg_selected_properties
from chatbot_memory_sessions s
left join chatbot_memory_events e on e.session_id = s.session_id
group by 1
order by 1 desc;
