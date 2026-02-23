-- Improve keyword RAG retrieval by dropping common French stopwords / query filler terms
-- before building the tsquery. This helps natural prompts like:
-- "Ou trouver les honoraires ?"

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
  raw_query text;
  normalized_query text;
  filtered_query text;
  effective_query text;
  tsq tsquery;
begin
  raw_query := trim(coalesce(query_text, ''));
  if raw_query = '' then
    return;
  end if;

  -- Keep letters/digits/slashes, normalize punctuation to spaces.
  normalized_query := lower(raw_query);
  normalized_query := regexp_replace(normalized_query, '[^[:alnum:]/]+', ' ', 'g');
  normalized_query := regexp_replace(normalized_query, '\s+', ' ', 'g');
  normalized_query := trim(normalized_query);

  select string_agg(token, ' ')
    into filtered_query
  from (
    select token
    from regexp_split_to_table(normalized_query, '\s+') as token
    where token <> ''
      and (
        token like '/%' or (
          length(token) > 1
          and token <> all (array[
            -- Common French stopwords / question scaffolding
            'a','ai','au','aux','avec','ce','ces','cette','cet','cela','ca','dans','de','des','du','d',
            'elle','elles','en','est','et','je','j','il','ils','la','le','les','leur','leurs','l',
            'ma','mes','mon','moi','ne','ni','nos','notre','nous','ou','où','par','pas','plus',
            'pour','puis','que','quel','quelle','quelles','quels','qui','quoi','sa','ses','son',
            'sur','ta','te','tes','toi','ton','tu','un','une','vos','votre','vous',
            -- Navigation / helper verbs often absent from page content
            'trouver','trouve','voir','ouvre','ouvrir','aller','page','lien','rubrique','site',
            'peux','pouvez','puisje','comment'
          ])
        )
      )
  ) filtered_tokens;

  effective_query := coalesce(nullif(trim(filtered_query), ''), normalized_query, raw_query);
  if effective_query = '' then
    return;
  end if;

  begin
    tsq := websearch_to_tsquery('simple', effective_query);
  exception
    when others then
      tsq := plainto_tsquery('simple', effective_query);
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
          coalesce(chunk.title, '') || ' ' ||
          coalesce(chunk.section_heading, '') || ' ' ||
          coalesce(chunk.path, '') || ' ' ||
          coalesce(chunk.content, '')
        ),
        tsq
      )::double precision as keyword_rank
    from chatbot_content_chunks as chunk
    where (path_prefix is null or chunk.path like path_prefix || '%')
      and to_tsvector(
        'simple',
        coalesce(chunk.title, '') || ' ' ||
        coalesce(chunk.section_heading, '') || ' ' ||
        coalesce(chunk.path, '') || ' ' ||
        coalesce(chunk.content, '')
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
