-- QA seed inventory for chatbot tool-assistant validation (search/compare/handoff).
-- Safe to re-run: uses conflict handling on city slug / property ids.

insert into cities (
  id,
  name,
  slug,
  postal_codes,
  is_active,
  hero_image_url
)
values (
  '11111111-1111-1111-1111-111111111001',
  'Le Havre',
  'le-havre',
  array['76600','76610','76620'],
  true,
  'https://foch.staticlbi.com/original/images/header/1.jpg'
)
on conflict (slug) do nothing;

insert into properties (
  id,
  title,
  slug,
  transaction_type,
  property_type,
  status,
  price_amount,
  price_currency,
  surface_m2,
  rooms,
  bedrooms,
  bathrooms,
  dpe_label,
  description,
  city_id,
  postal_code,
  published_at,
  updated_at,
  created_at
)
values
  (
    910001,
    '[QA] T3 Perret proche plage',
    'qa-t3-perret-proche-plage',
    'vente',
    'appartement',
    'active',
    248000,
    'EUR',
    68,
    3,
    2,
    1,
    'D',
    'Annonce QA pour tester la recherche, comparaison et préremplissage du chatbot.',
    (select id from cities where slug = 'le-havre' limit 1),
    '76600',
    now() - interval '1 day',
    now(),
    now()
  ),
  (
    910002,
    '[QA] Appartement T3 Saint-Vincent balcon',
    'qa-appartement-t3-saint-vincent-balcon',
    'vente',
    'appartement',
    'active',
    259000,
    'EUR',
    72,
    3,
    2,
    1,
    'C',
    'Annonce QA pour tester la recherche, comparaison et préremplissage du chatbot.',
    (select id from cities where slug = 'le-havre' limit 1),
    '76600',
    now() - interval '2 day',
    now(),
    now()
  ),
  (
    910003,
    '[QA] Appartement T4 Sanvic lumineux',
    'qa-appartement-t4-sanvic-lumineux',
    'vente',
    'appartement',
    'active',
    287000,
    'EUR',
    84,
    4,
    3,
    1,
    'E',
    'Annonce QA pour tester la recherche, comparaison et préremplissage du chatbot.',
    (select id from cities where slug = 'le-havre' limit 1),
    '76620',
    now() - interval '3 day',
    now(),
    now()
  )
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  transaction_type = excluded.transaction_type,
  property_type = excluded.property_type,
  status = excluded.status,
  price_amount = excluded.price_amount,
  price_currency = excluded.price_currency,
  surface_m2 = excluded.surface_m2,
  rooms = excluded.rooms,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  dpe_label = excluded.dpe_label,
  description = excluded.description,
  city_id = excluded.city_id,
  postal_code = excluded.postal_code,
  published_at = excluded.published_at,
  updated_at = now();

insert into property_images (property_id, source_url, sort_order, alt_text)
values
  (910001, 'https://foch.staticlbi.com/original/images/header/1.jpg', 0, 'QA image 1'),
  (910002, 'https://foch.staticlbi.com/original/images/header/1.jpg', 0, 'QA image 2'),
  (910003, 'https://foch.staticlbi.com/original/images/header/1.jpg', 0, 'QA image 3')
on conflict (property_id, source_url) do update set
  sort_order = excluded.sort_order,
  alt_text = excluded.alt_text;

-- Minimal RAG seed to keep core evals deterministic in local environments without external model keys.
insert into chatbot_content_chunks (
  document_key,
  source_kind,
  source_url,
  path,
  title,
  section_heading,
  chunk_index,
  content,
  content_hash,
  token_estimate,
  metadata
)
values (
  'site:/honoraires',
  'web_page',
  'https://www.fochimmobilier.com/honoraires',
  '/honoraires',
  'Honoraires',
  'Honoraires agence',
  0,
  'Honoraires de transaction et de location : consultez les honoraires de l agence Foch Immobilier sur cette page.',
  'seed-honoraires-1',
  24,
  '{}'::jsonb
)
on conflict (document_key, chunk_index) do update set
  source_url = excluded.source_url,
  path = excluded.path,
  title = excluded.title,
  section_heading = excluded.section_heading,
  content = excluded.content,
  content_hash = excluded.content_hash,
  token_estimate = excluded.token_estimate,
  metadata = excluded.metadata,
  updated_at = now();
