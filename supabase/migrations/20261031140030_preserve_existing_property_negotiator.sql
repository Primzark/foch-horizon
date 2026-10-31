-- Use the external property reference (id) as the conflict key. Imports only
-- touch listings present in the feed; missing references are always retained.
-- Existing listings keep their status, online setting, and negotiator assignment.
CREATE OR REPLACE FUNCTION public.import_property_feed(p_feed jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
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
BEGIN
  IF jsonb_typeof(p_feed->'cities') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_feed->'agents') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_feed->'properties') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'The feed must include cities, agents, and properties arrays.' USING ERRCODE = '22023';
  END IF;

  FOR city_row IN SELECT value FROM jsonb_array_elements(p_feed->'cities') LOOP
    INSERT INTO public.cities (name, slug, postal_codes, is_active, hero_image_url, updated_at)
    VALUES (
      city_row->>'name',
      city_row->>'slug',
      ARRAY(SELECT jsonb_array_elements_text(coalesce(city_row->'postalCodes', '[]'::jsonb))),
      coalesce((city_row->>'isActive')::boolean, true),
      nullif(city_row->>'heroImageUrl', ''),
      now()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = excluded.name,
      postal_codes = excluded.postal_codes,
      is_active = excluded.is_active,
      hero_image_url = excluded.hero_image_url,
      updated_at = excluded.updated_at
    RETURNING id INTO city_db_id;

    city_id_map := city_id_map || jsonb_build_object(city_row->>'id', city_db_id);
  END LOOP;

  -- Keep existing negotiator records and their manually maintained details intact.
  -- New stable IDs may be added for newly encountered negotiators.
  FOR agent_row IN SELECT value FROM jsonb_array_elements(p_feed->'agents') LOOP
    INSERT INTO public.agents (id, full_name, role, phone, mobile, email, portrait_url, bio, is_active, updated_at)
    VALUES (
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
    ON CONFLICT (id) DO NOTHING;

    agent_id_map := agent_id_map || jsonb_build_object(agent_row->>'id', agent_row->>'sync_id');
  END LOOP;

  FOR property_row IN SELECT value FROM jsonb_array_elements(p_feed->'properties') LOOP
    current_property_id := (property_row->>'id')::integer;
    city_db_id := nullif(city_id_map->>(property_row->>'cityId'), '')::uuid;
    IF city_db_id IS NULL THEN
      RAISE EXCEPTION 'Property % references a city missing from the feed.', current_property_id USING ERRCODE = '22023';
    END IF;

    -- status, source_status, admin_status_override, is_online, and is_featured
    -- are deliberately omitted. New listings use database defaults; imports
    -- never change manual availability, status, visibility, or featured state.
    INSERT INTO public.properties (
      id, title, slug, transaction_type, property_type,
      price_amount, price_currency, surface_m2, terrain_m2, rooms, bedrooms, bathrooms,
      parking_count, garage_count, dpe_label, dpe_value, ges_label, ges_value, description,
      city_id, postal_code, lat, lng, agent_id, published_at, updated_at
    ) VALUES (
      current_property_id,
      property_row->>'title',
      property_row->>'slug',
      (property_row->>'transactionType')::public.transaction_type,
      (property_row->>'propertyType')::public.property_type,
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
    -- agent_id is populated for new listings, but omitted from this update so
    -- an existing listing keeps its current negotiator assignment.
    ON CONFLICT (id) DO UPDATE SET
      title = excluded.title,
      slug = excluded.slug,
      transaction_type = excluded.transaction_type,
      property_type = excluded.property_type,
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
      published_at = excluded.published_at,
      updated_at = excluded.updated_at;

    DELETE FROM public.property_images WHERE property_id = current_property_id;
    DELETE FROM public.property_features WHERE property_id = current_property_id;

    FOR image_row IN SELECT value FROM jsonb_array_elements(coalesce(property_row->'images', '[]'::jsonb)) LOOP
      IF nullif(image_row->>'sourceUrl', '') IS NOT NULL THEN
        INSERT INTO public.property_images (property_id, source_url, sort_order, alt_text)
        VALUES (
          current_property_id,
          image_row->>'sourceUrl',
          coalesce(nullif(image_row->>'sortOrder', '')::integer, 0),
          nullif(image_row->>'altText', '')
        );
        image_count := image_count + 1;
      END IF;
    END LOOP;

    FOR feature_row IN SELECT value FROM jsonb_array_elements(coalesce(property_row->'features', '[]'::jsonb)) LOOP
      IF nullif(feature_row->>'featureKey', '') IS NOT NULL AND nullif(feature_row->>'labelFr', '') IS NOT NULL THEN
        INSERT INTO public.property_features (property_id, feature_key, label_fr)
        VALUES (current_property_id, feature_row->>'featureKey', feature_row->>'labelFr');
        feature_count := feature_count + 1;
      END IF;
    END LOOP;

    property_count := property_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'properties', property_count,
    'images', image_count,
    'features', feature_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_property_feed(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_property_feed(jsonb) TO service_role;
