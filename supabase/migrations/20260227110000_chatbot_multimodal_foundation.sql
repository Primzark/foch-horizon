-- Gemini Max foundation: multimodal property document + analysis cache + job queue

create table if not exists property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id bigint not null references properties(id) on delete cascade,
  kind text not null,
  source_url text not null,
  mime_type text,
  sha256 text,
  status text not null default 'pending',
  last_fetch_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_documents_kind_check check (kind in ('dpe_pdf', 'diagnostic_pdf', 'floor_plan_pdf', 'brochure_pdf', 'other')),
  constraint property_documents_status_check check (status in ('pending', 'ready', 'error', 'skipped'))
);

create unique index if not exists uq_property_documents_property_kind_url
  on property_documents(property_id, kind, source_url);
create index if not exists idx_property_documents_property_id on property_documents(property_id);
create index if not exists idx_property_documents_status on property_documents(status);
create index if not exists idx_property_documents_updated_at on property_documents(updated_at desc);

create table if not exists property_media_analysis (
  id uuid primary key default gen_random_uuid(),
  property_id bigint not null references properties(id) on delete cascade,
  source_kind text not null,
  source_id uuid references property_documents(id) on delete set null,
  source_url text not null,
  model text not null,
  analysis_version text not null,
  status text not null,
  summary_short text,
  summary_long text,
  structured_facts jsonb not null default '{}'::jsonb,
  safety_flags jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  cost_estimate_usd numeric,
  latency_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_media_analysis_source_kind_check check (source_kind in ('image', 'document')),
  constraint property_media_analysis_status_check check (status in ('ready', 'error', 'stale'))
);

create unique index if not exists uq_property_media_analysis_dedupe
  on property_media_analysis(source_kind, source_url, analysis_version);
create index if not exists idx_property_media_analysis_property_id on property_media_analysis(property_id);
create index if not exists idx_property_media_analysis_status on property_media_analysis(status);
create index if not exists idx_property_media_analysis_updated_at on property_media_analysis(updated_at desc);

create table if not exists property_media_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  property_id bigint not null references properties(id) on delete cascade,
  job_type text not null,
  priority smallint not null default 50,
  status text not null default 'queued',
  attempts integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  constraint property_media_analysis_jobs_job_type_check check (job_type in ('analyze_images', 'analyze_documents', 'refresh_property_media')),
  constraint property_media_analysis_jobs_status_check check (status in ('queued', 'running', 'done', 'error'))
);

create index if not exists idx_property_media_jobs_status_priority
  on property_media_analysis_jobs(status, priority desc, created_at asc);
create index if not exists idx_property_media_jobs_property_id on property_media_analysis_jobs(property_id);
create index if not exists idx_property_media_jobs_created_at on property_media_analysis_jobs(created_at desc);

alter table property_documents enable row level security;
alter table property_media_analysis enable row level security;
alter table property_media_analysis_jobs enable row level security;

drop policy if exists service_role_all_property_documents on property_documents;
create policy service_role_all_property_documents
  on property_documents
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists service_role_all_property_media_analysis on property_media_analysis;
create policy service_role_all_property_media_analysis
  on property_media_analysis
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists service_role_all_property_media_analysis_jobs on property_media_analysis_jobs;
create policy service_role_all_property_media_analysis_jobs
  on property_media_analysis_jobs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace view chatbot_multimodal_daily as
select
  date_trunc('day', created_at)::date as day,
  count(*) as analyses_total,
  count(*) filter (where source_kind = 'image') as image_analyses,
  count(*) filter (where source_kind = 'document') as document_analyses,
  count(*) filter (where status = 'ready') as ready_count,
  count(*) filter (where status = 'error') as error_count,
  avg(latency_ms) filter (where latency_ms is not null) as avg_latency_ms,
  sum(cost_estimate_usd) filter (where cost_estimate_usd is not null) as total_cost_estimate_usd
from property_media_analysis
group by 1
order by 1 desc;
