-- Persistent memory extractor support and TTL retention

alter table if exists chatbot_memory_sessions
  add column if not exists expires_at timestamptz;

create index if not exists idx_chatbot_memory_sessions_expires_at
  on chatbot_memory_sessions(expires_at);

-- Backfill a default expiry for existing rows (90 days from now)
update chatbot_memory_sessions
set expires_at = coalesce(expires_at, now() + interval '90 days')
where expires_at is null;

