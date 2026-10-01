update public.chatbot_content_chunks
set content = 'Barème des honoraires de négociation pour les ventes : consultez le document publié par l agence Foch Immobilier sur cette page.',
    content_hash = 'seed-honoraires-sale-only-1',
    token_estimate = 21,
    updated_at = now()
where document_key = 'site:/honoraires'
  and chunk_index = 0;
