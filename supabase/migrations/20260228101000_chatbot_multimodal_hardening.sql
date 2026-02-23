-- Multimodal hardening: queue dedupe and richer source/cache metadata

alter table if exists property_documents
  add column if not exists file_size_bytes bigint,
  add column if not exists page_count integer,
  add column if not exists http_etag text,
  add column if not exists http_last_modified text,
  add column if not exists expires_at timestamptz;

alter table if exists property_media_analysis
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists source_hash text,
  add column if not exists cache_key text;

alter table if exists property_media_analysis_jobs
  add column if not exists next_attempt_at timestamptz,
  add column if not exists locked_by text;

create unique index if not exists uq_property_media_analysis_jobs_queued_once
  on property_media_analysis_jobs(property_id, job_type)
  where status = 'queued';

create index if not exists idx_property_media_jobs_next_attempt_at
  on property_media_analysis_jobs(next_attempt_at)
  where next_attempt_at is not null;

