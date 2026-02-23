-- Chatbot RAG hybrid retrieval additions (keyword search + FTS index)
-- Requires chatbot_content_chunks from 20260223_chatbot_rag.sql

create index if not exists idx_chatbot_content_chunks_search_vector
  on chatbot_content_chunks
  using gin (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(section_heading, '') || ' ' ||
      coalesce(path, '') || ' ' ||
      coalesce(content, '')
    )
  );

create or replace function match_chatbot_content_chunks_keyword(
  query_text text,
  match_count integer default 12,
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
  keyword_rank double precision
)
language plpgsql
stable
as $$
declare
  safe_query text;
  tsq tsquery;
begin
  safe_query := trim(coalesce(query_text, ''));
  if safe_query = '' then
    return;
  end if;

  begin
    tsq := websearch_to_tsquery('simple', safe_query);
  exception
    when others then
      tsq := plainto_tsquery('simple', safe_query);
  end;

  return query
  with ranked as (
    select
      chunk.id,
      chunk.document_key,
      chunk.path,
      chunk.source_url,
      chunk.title,
      chunk.section_heading,
      chunk.content,
      chunk.metadata,
      ts_rank_cd(
        to_tsvector(
          'simple',
          concat_ws(
            ' ',
            coalesce(chunk.title, ''),
            coalesce(chunk.section_heading, ''),
            coalesce(chunk.path, ''),
            coalesce(chunk.content, '')
          )
        ),
        tsq
      )::double precision as keyword_rank
    from chatbot_content_chunks as chunk
    where (path_prefix is null or chunk.path like path_prefix || '%')
      and to_tsvector(
        'simple',
        concat_ws(
          ' ',
          coalesce(chunk.title, ''),
          coalesce(chunk.section_heading, ''),
          coalesce(chunk.path, ''),
          coalesce(chunk.content, '')
        )
      ) @@ tsq
  )
  select
    ranked.id,
    ranked.document_key,
    ranked.path,
    ranked.source_url,
    ranked.title,
    ranked.section_heading,
    ranked.content,
    ranked.metadata,
    ranked.keyword_rank
  from ranked
  where ranked.keyword_rank > 0
  order by ranked.keyword_rank desc, ranked.path asc
  limit greatest(coalesce(match_count, 12), 1);
end;
$$;
