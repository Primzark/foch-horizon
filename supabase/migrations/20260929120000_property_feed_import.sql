alter table public.properties
  add column if not exists source_status text;

create or replace function public.import_property_feed(p_feed jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  city_row jsonb;
  agent_row jsonb;
  property_row jsonb;
  image_row jsonb;
  feature_row jsonb;
  city_db_id uuid;
  city_id_map jsonb := '{}'::jsonb;
  agent_id_map jsonb := '{}'::jsonb;
  current_property_id integer;
  property_count integer := 0;
  image_count integer := 0;
  feature_count integer := 0;
begin
  if jsonb_typeof(p_feed->'cities') is distinct from 'array'
    or jsonb_typeof(p_feed->'agents') is distinct from 'array'
    or jsonb_typeof(p_feed->'properties') is distinct from 'array' then
    raise exception 'The feed must include cities, agents, and properties arrays.' using errcode = '22023';
  end if;

  for city_row in select value from jsonb_array_elements(p_feed->'cities') loop
    insert into public.cities (name, slug, postal_codes, is_active, hero_image_url, updated_at)
    values (
      city_row->>'name',
      city_row->>'slug',
      array(select jsonb_array_elements_text(coalesce(city_row->'postalCodes', '[]'::jsonb))),
      coalesce((city_row->>'isActive')::boolean, true),
      nullif(city_row->>'heroImageUrl', ''),
      now()
    )
    on conflict (slug) do update set
      name = excluded.name,
      postal_codes = excluded.postal_codes,
      is_active = excluded.is_active,
      hero_image_url = excluded.hero_image_url,
      updated_at = excluded.updated_at
    returning id into city_db_id;

    city_id_map := city_id_map || jsonb_build_object(city_row->>'id', city_db_id);
  end loop;

  for agent_row in select value from jsonb_array_elements(p_feed->'agents') loop
    insert into public.agents (id, full_name, role, phone, mobile, email, portrait_url, bio, is_active, updated_at)
    values (
      (agent_row->>'sync_id')::uuid,
      agent_row->>'fullName',
      coalesce(agent_row->>'role', 'Conseiller immobilier'),
      nullif(agent_row->>'phone', ''),
      nullif(agent_row->>'mobile', ''),
      nullif(agent_row->>'email', ''),
      nullif(agent_row->>'portraitUrl', ''),
      nullif(agent_row->>'bio', ''),
      coalesce((agent_row->>'isActive')::boolean, true),
      now()
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      role = excluded.role,
      phone = excluded.phone,
      mobile = excluded.mobile,
      email = excluded.email,
      portrait_url = excluded.portrait_url,
      bio = excluded.bio,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at;

    agent_id_map := agent_id_map || jsonb_build_object(agent_row->>'id', agent_row->>'sync_id');
  end loop;

  for property_row in select value from jsonb_array_elements(p_feed->'properties') loop
    current_property_id := (property_row->>'id')::integer;
    city_db_id := nullif(city_id_map->>(property_row->>'cityId'), '')::uuid;
    if city_db_id is null then
      raise exception 'Property % references a city missing from the feed.', current_property_id using errcode = '22023';
    end if;

    insert into public.properties (
      id, title, slug, transaction_type, property_type, status, source_status,
      price_amount, price_currency, surface_m2, terrain_m2, rooms, bedrooms, bathrooms,
      parking_count, garage_count, dpe_label, dpe_value, ges_label, ges_value, description,
      city_id, postal_code, lat, lng, agent_id, published_at, updated_at
    ) values (
      current_property_id,
      property_row->>'title',
      property_row->>'slug',
      (property_row->>'transactionType')::public.transaction_type,
      (property_row->>'propertyType')::public.property_type,
      (property_row->>'status')::public.property_status,
      nullif(property_row->>'sourceStatus', ''),
      (property_row->>'priceAmount')::integer,
      coalesce(nullif(property_row->>'priceCurrency', ''), 'EUR'),
      nullif(property_row->>'surfaceM2', '')::numeric,
      nullif(property_row->>'terrainM2', '')::numeric,
      nullif(property_row->>'rooms', '')::integer,
      nullif(property_row->>'bedrooms', '')::integer,
      nullif(property_row->>'bathrooms', '')::integer,
      nullif(property_row->>'parkingCount', '')::integer,
      nullif(property_row->>'garageCount', '')::integer,
      nullif(property_row->>'dpeLabel', ''),
      nullif(property_row->>'dpeValue', '')::numeric,
      nullif(property_row->>'gesLabel', ''),
      nullif(property_row->>'gesValue', '')::numeric,
      nullif(property_row->>'description', ''),
      city_db_id,
      nullif(property_row->>'postalCode', ''),
      nullif(property_row->>'lat', '')::numeric,
      nullif(property_row->>'lng', '')::numeric,
      nullif(agent_id_map->>(property_row->>'agentId'), '')::uuid,
      nullif(property_row->>'publishedAt', '')::timestamptz,
      coalesce(nullif(property_row->>'updatedAt', '')::timestamptz, now())
    )
    on conflict (id) do update set
      title = excluded.title,
      slug = excluded.slug,
      transaction_type = excluded.transaction_type,
      property_type = excluded.property_type,
      status = excluded.status,
      source_status = excluded.source_status,
      price_amount = excluded.price_amount,
      price_currency = excluded.price_currency,
      surface_m2 = excluded.surface_m2,
      terrain_m2 = excluded.terrain_m2,
      rooms = excluded.rooms,
      bedrooms = excluded.bedrooms,
      bathrooms = excluded.bathrooms,
      parking_count = excluded.parking_count,
      garage_count = excluded.garage_count,
      dpe_label = excluded.dpe_label,
      dpe_value = excluded.dpe_value,
      ges_label = excluded.ges_label,
      ges_value = excluded.ges_value,
      description = excluded.description,
      city_id = excluded.city_id,
      postal_code = excluded.postal_code,
      lat = excluded.lat,
      lng = excluded.lng,
      agent_id = excluded.agent_id,
      published_at = excluded.published_at,
      updated_at = excluded.updated_at;

    delete from public.property_images where property_images.property_id = current_property_id;
    delete from public.property_features where property_features.property_id = current_property_id;

    for image_row in select value from jsonb_array_elements(coalesce(property_row->'images', '[]'::jsonb)) loop
      if nullif(image_row->>'sourceUrl', '') is not null then
        insert into public.property_images (property_id, source_url, sort_order, alt_text)
        values (
          current_property_id,
          image_row->>'sourceUrl',
          coalesce(nullif(image_row->>'sortOrder', '')::integer, 0),
          nullif(image_row->>'altText', '')
        );
        image_count := image_count + 1;
      end if;
    end loop;

    for feature_row in select value from jsonb_array_elements(coalesce(property_row->'features', '[]'::jsonb)) loop
      if nullif(feature_row->>'featureKey', '') is not null and nullif(feature_row->>'labelFr', '') is not null then
        insert into public.property_features (property_id, feature_key, label_fr)
        values (current_property_id, feature_row->>'featureKey', feature_row->>'labelFr');
        feature_count := feature_count + 1;
      end if;
    end loop;

    property_count := property_count + 1;
  end loop;

  return jsonb_build_object(
    'properties', property_count,
    'images', image_count,
    'features', feature_count
  );
end;
$$;

revoke all on function public.import_property_feed(jsonb) from public, anon, authenticated;
grant execute on function public.import_property_feed(jsonb) to service_role;
