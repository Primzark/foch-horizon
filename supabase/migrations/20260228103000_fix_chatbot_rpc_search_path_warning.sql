-- Re-apply fixed search_path on chatbot RPC functions.
-- This is intentionally dynamic (catalog-driven) so it works even if the
-- function signature evolved and no longer matches older ALTER statements.

do $$
declare
  function_signature text;
begin
  for function_signature in
    select format(
      '%I.%I(%s)',
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid)
    )
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'match_chatbot_content_chunks',
        'match_chatbot_content_chunks_keyword'
      )
  loop
    execute format(
      'alter function %s set search_path = pg_catalog, public, extensions',
      function_signature
    );
  end loop;
end $$;

