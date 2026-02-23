-- Gemini Max foundation: eval runs/results + ops views (planner/memory/cost)

create table if not exists chatbot_eval_cases (
  id uuid primary key default gen_random_uuid(),
  suite text not null,
  name text not null,
  input jsonb not null default '{}'::jsonb,
  expected jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_chatbot_eval_cases_suite_name on chatbot_eval_cases(suite, name);
create index if not exists idx_chatbot_eval_cases_active on chatbot_eval_cases(active);

create table if not exists chatbot_eval_runs (
  id uuid primary key default gen_random_uuid(),
  suite text not null,
  git_sha text,
  env text,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  constraint chatbot_eval_runs_status_check check (status in ('queued', 'running', 'passed', 'failed', 'partial'))
);

create index if not exists idx_chatbot_eval_runs_started_at on chatbot_eval_runs(started_at desc);
create index if not exists idx_chatbot_eval_runs_suite on chatbot_eval_runs(suite);

create table if not exists chatbot_eval_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references chatbot_eval_runs(id) on delete cascade,
  case_id uuid not null references chatbot_eval_cases(id) on delete cascade,
  pass boolean not null,
  scores jsonb not null default '{}'::jsonb,
  actual jsonb not null default '{}'::jsonb,
  failure_reason text,
  latency_ms integer,
  cost_estimate_usd numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_chatbot_eval_results_run_id on chatbot_eval_results(run_id);
create index if not exists idx_chatbot_eval_results_case_id on chatbot_eval_results(case_id);
create index if not exists idx_chatbot_eval_results_created_at on chatbot_eval_results(created_at desc);

alter table chatbot_eval_cases enable row level security;
alter table chatbot_eval_runs enable row level security;
alter table chatbot_eval_results enable row level security;

drop policy if exists service_role_all_chatbot_eval_cases on chatbot_eval_cases;
create policy service_role_all_chatbot_eval_cases
  on chatbot_eval_cases for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists service_role_all_chatbot_eval_runs on chatbot_eval_runs;
create policy service_role_all_chatbot_eval_runs
  on chatbot_eval_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists service_role_all_chatbot_eval_results on chatbot_eval_results;
create policy service_role_all_chatbot_eval_results
  on chatbot_eval_results for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace view chatbot_planner_daily as
select
  date_trunc('day', created_at)::date as day,
  count(*) filter (where event_type in ('planner_v2_plan_executed', 'planner_v2_clarify')) as planner_events,
  count(*) filter (where event_type = 'planner_v2_plan_executed') as planner_plan_count,
  count(*) filter (where event_type = 'planner_v2_clarify') as planner_clarify_count,
  avg((metadata ->> 'plannerConfidence')::double precision) filter (where metadata ? 'plannerConfidence')
    as avg_planner_confidence,
  avg(case when coalesce((metadata ->> 'plannerFallback') = 'true', false) then 1.0 else 0.0 end)
    filter (where event_type in ('reply_received', 'tool_orchestration_result')) as planner_fallback_ratio
from chatbot_quality_events
group by 1
order by 1 desc;

create or replace view chatbot_cost_estimate_daily as
select
  date_trunc('day', created_at)::date as day,
  count(*) filter (where event_type = 'reply_received') as reply_count,
  count(*) filter (where coalesce(metadata ->> 'estimatedCostClass', '') = 'low') as low_cost_count,
  count(*) filter (where coalesce(metadata ->> 'estimatedCostClass', '') = 'medium') as medium_cost_count,
  count(*) filter (where coalesce(metadata ->> 'estimatedCostClass', '') = 'high') as high_cost_count,
  count(*) filter (where coalesce(metadata ->> 'analysisCacheHit', '') = 'true') as multimodal_cache_hits
from chatbot_quality_events
group by 1
order by 1 desc;

create or replace view chatbot_eval_summary_latest as
select
  r.id as run_id,
  r.suite,
  r.status,
  r.git_sha,
  r.env,
  r.started_at,
  r.finished_at,
  count(res.id) as case_count,
  count(res.id) filter (where res.pass) as pass_count,
  count(res.id) filter (where not res.pass) as fail_count,
  avg(res.latency_ms) filter (where res.latency_ms is not null) as avg_latency_ms,
  sum(res.cost_estimate_usd) filter (where res.cost_estimate_usd is not null) as total_cost_estimate_usd
from chatbot_eval_runs r
left join chatbot_eval_results res on res.run_id = r.id
where r.started_at >= now() - interval '30 days'
group by r.id, r.suite, r.status, r.git_sha, r.env, r.started_at, r.finished_at
order by r.started_at desc;

create or replace view chatbot_regressions_7d as
select
  c.suite,
  c.name,
  count(*) filter (where not res.pass) as failures,
  max(res.created_at) as last_failure_at,
  array_agg(distinct res.failure_reason) filter (where res.failure_reason is not null and not res.pass) as failure_reasons
from chatbot_eval_results res
join chatbot_eval_cases c on c.id = res.case_id
where res.created_at >= now() - interval '7 days'
group by c.suite, c.name
having count(*) filter (where not res.pass) > 0
order by failures desc, last_failure_at desc;
