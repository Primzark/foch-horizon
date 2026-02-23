-- Chatbot quality telemetry and feedback events

create table if not exists chatbot_quality_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  session_id text not null,
  conversation_id text not null,
  message_id text,
  request_id text,
  page_path text,
  source text,
  edge_provider text,
  route_decision text,
  route_category text,
  intent text,
  rag_used boolean,
  retrieval_mode text,
  citations_count integer not null default 0,
  citation_path text,
  response_latency_ms integer,
  request_chars integer,
  answer_chars integer,
  feedback_value smallint,
  feedback_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint chatbot_quality_events_feedback_value_check
    check (feedback_value is null or feedback_value in (-1, 1))
);

create index if not exists idx_chatbot_quality_events_created_at
  on chatbot_quality_events(created_at desc);
create index if not exists idx_chatbot_quality_events_event_type
  on chatbot_quality_events(event_type);
create index if not exists idx_chatbot_quality_events_message_id
  on chatbot_quality_events(message_id);
create index if not exists idx_chatbot_quality_events_session_id
  on chatbot_quality_events(session_id);
create index if not exists idx_chatbot_quality_events_route_category
  on chatbot_quality_events(route_category);

alter table chatbot_quality_events enable row level security;

drop policy if exists service_role_all_chatbot_quality_events on chatbot_quality_events;
create policy service_role_all_chatbot_quality_events
  on chatbot_quality_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace view chatbot_quality_daily as
select
  date_trunc('day', created_at)::date as day,
  count(*) as total_events,
  count(*) filter (where event_type = 'reply_received') as reply_count,
  count(*) filter (where event_type = 'request_failed') as request_failed_count,
  avg(response_latency_ms) filter (where event_type = 'reply_received' and response_latency_ms is not null)
    as avg_reply_latency_ms,
  avg(citations_count) filter (where event_type = 'reply_received') as avg_citations_count,
  avg(case when rag_used then 1.0 else 0.0 end) filter (where event_type = 'reply_received') as rag_used_ratio,
  avg(case when source = 'edge' then 1.0 else 0.0 end) filter (where event_type = 'reply_received') as edge_reply_ratio,
  avg(case when source = 'local' then 1.0 else 0.0 end) filter (where event_type = 'reply_received') as local_reply_ratio
from chatbot_quality_events
group by 1
order by 1 desc;

create or replace view chatbot_feedback_daily as
select
  date_trunc('day', created_at)::date as day,
  count(*) filter (where event_type = 'feedback_submitted' and feedback_value = 1) as thumbs_up_count,
  count(*) filter (where event_type = 'feedback_submitted' and feedback_value = -1) as thumbs_down_count,
  count(*) filter (where event_type = 'feedback_submitted') as feedback_count,
  case
    when count(*) filter (where event_type = 'feedback_submitted') = 0 then null
    else
      (count(*) filter (where event_type = 'feedback_submitted' and feedback_value = 1)::double precision)
      / (count(*) filter (where event_type = 'feedback_submitted')::double precision)
  end as helpfulness_rate
from chatbot_quality_events
group by 1
order by 1 desc;

create or replace view chatbot_top_citations_7d as
select
  citation_path,
  count(*) as clicks,
  max(created_at) as last_clicked_at
from chatbot_quality_events
where event_type = 'citation_clicked'
  and citation_path is not null
  and created_at >= now() - interval '7 days'
group by citation_path
order by clicks desc, last_clicked_at desc;
