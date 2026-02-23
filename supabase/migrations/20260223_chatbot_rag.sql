-- Chatbot RAG content index (website pages + future sources)
-- Generated on 2026-02-23

create extension if not exists vector;

create table if not exists chatbot_content_chunks (
  id uuid primary key default gen_random_uuid(),
  document_key text not null,
  source_kind text not null default 'web_page',
  source_url text not null,
  path text not null,
  title text,
  section_heading text,
  chunk_index integer not null,
  content text not null,
  content_hash text not null,
  token_estimate integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_key, chunk_index)
);

create index if not exists idx_chatbot_content_chunks_document_key
  on chatbot_content_chunks(document_key);
create index if not exists idx_chatbot_content_chunks_path
  on chatbot_content_chunks(path);
create index if not exists idx_chatbot_content_chunks_source_kind
  on chatbot_content_chunks(source_kind);
create index if not exists idx_chatbot_content_chunks_embedding_cosine
  on chatbot_content_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 20);

alter table chatbot_content_chunks enable row level security;

drop policy if exists service_role_all_chatbot_content_chunks on chatbot_content_chunks;
create policy service_role_all_chatbot_content_chunks
  on chatbot_content_chunks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function match_chatbot_content_chunks(
  query_embedding_text text,
  match_count integer default 6,
  match_threshold double precision default 0.70,
  path_prefix text default null
)
returns table (
  id uuid,
  document_key text,
  path text,
  source_url text,
  title text,
  section_heading text,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  with query_params as (
    select query_embedding_text::vector(1536) as embedding
  )
  select
    chunk.id,
    chunk.document_key,
    chunk.path,
    chunk.source_url,
    chunk.title,
    chunk.section_heading,
    chunk.content,
    chunk.metadata,
    1 - (chunk.embedding <=> query_params.embedding) as similarity
  from chatbot_content_chunks as chunk
  cross join query_params
  where chunk.embedding is not null
    and (path_prefix is null or chunk.path like path_prefix || '%')
    and (1 - (chunk.embedding <=> query_params.embedding)) >= coalesce(match_threshold, 0.70)
  order by chunk.embedding <=> query_params.embedding
  limit greatest(coalesce(match_count, 6), 1);
$$;

