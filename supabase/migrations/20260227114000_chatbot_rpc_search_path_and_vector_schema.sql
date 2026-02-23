-- Supabase linter fixes:
-- 1) Set fixed search_path on chatbot RPC functions (avoid role-mutable search_path warnings)
-- 2) Move pgvector extension out of public schema into extensions

create schema if not exists extensions;

-- Move the pgvector extension if it is currently installed outside `extensions`.
do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'vector'
      and n.nspname <> 'extensions'
  ) then
    execute 'alter extension vector set schema extensions';
  end if;
end $$;

-- Fix mutable search_path warnings by pinning a safe, explicit search_path.
-- `extensions` is required so vector type/operators remain resolvable after moving pgvector.
do $$
begin
  if to_regprocedure('public.match_chatbot_content_chunks(text, integer, double precision, text)') is not null then
    execute 'alter function public.match_chatbot_content_chunks(text, integer, double precision, text) set search_path = public, extensions';
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.match_chatbot_content_chunks_keyword(text, integer, text)') is not null then
    execute 'alter function public.match_chatbot_content_chunks_keyword(text, integer, text) set search_path = public, extensions';
  end if;
end $$;
