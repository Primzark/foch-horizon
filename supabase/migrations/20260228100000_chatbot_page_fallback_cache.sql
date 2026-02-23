-- On-demand page fetch fallback cache for chatbot RAG misses / weak matches

create table if not exists chatbot_page_snapshot_cache (
  path text primary key,
  source_url text not null,
  fetch_mode text not null check (fetch_mode in ('http', 'headless')),
  status text not null check (status in ('ready', 'error', 'thin', 'skipped')),
  title text,
  content_text text,
  content_hash text,
  word_count integer not null default 0,
  last_fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chatbot_page_snapshot_cache_expires_at
  on chatbot_page_snapshot_cache(expires_at);
create index if not exists idx_chatbot_page_snapshot_cache_updated_at
  on chatbot_page_snapshot_cache(updated_at desc);
create index if not exists idx_chatbot_page_snapshot_cache_status
  on chatbot_page_snapshot_cache(status);

alter table chatbot_page_snapshot_cache enable row level security;

drop policy if exists service_role_all_chatbot_page_snapshot_cache on chatbot_page_snapshot_cache;
create policy service_role_all_chatbot_page_snapshot_cache
  on chatbot_page_snapshot_cache
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

