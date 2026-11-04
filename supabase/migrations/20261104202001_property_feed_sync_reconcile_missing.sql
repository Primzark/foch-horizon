-- Synchronize the inventory atomically from the .NET uploader. The feed is
-- authoritative for non-sold listings: missing listings are taken offline,
-- while sold listings and property rows are never deleted.
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
  feed_property_ids integer[];
  existing_property_ids integer[];
  added_properties jsonb := '[]'::jsonb;
  updated_properties jsonb := '[]'::jsonb;
  offlined_properties jsonb := '[]'::jsonb;
  ignored_properties jsonb := '[]'::jsonb;
  property_count integer := 0;
  image_count integer := 0;
  feature_count integer := 0;
BEGIN
  IF jsonb_typeof(p_feed->'cities') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_feed->'agents') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_feed->'properties') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'The feed must include cities, agents, and properties arrays.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_feed->'properties') = 0
    OR jsonb_array_length(p_feed->'properties') > 250 THEN
    RAISE EXCEPTION 'The feed must contain between 1 and 250 properties.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_feed->'properties') AS entry(value)
    WHERE jsonb_typeof(entry.value) IS DISTINCT FROM 'object'
      OR coalesce(entry.value->>'id', '') !~ '^[1-9][0-9]*$'
  ) THEN
    RAISE EXCEPTION 'Every property must have a positive integer reference.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_feed->'properties') AS entry(value)
    GROUP BY (entry.value->>'id')::integer
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Property references must be unique in a feed.' USING ERRCODE = '22023';
  END IF;

  -- Serialize imports so added/updated classifications and reconciliation use
  -- a consistent inventory snapshot when two executables run at once.
  PERFORM pg_catalog.pg_advisory_xact_lock(207733, 1);

  SELECT coalesce(array_agg((entry.value->>'id')::integer), ARRAY[]::integer[])
  INTO feed_property_ids
  FROM jsonb_array_elements(p_feed->'properties') AS entry(value);

  SELECT coalesce(array_agg(p.id), ARRAY[]::integer[])
  INTO existing_property_ids
  FROM public.properties AS p
  WHERE p.id = ANY(feed_property_ids);

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

    IF current_property_id = ANY(existing_property_ids) THEN
      updated_properties := updated_properties || jsonb_build_array(
        jsonb_build_object('id', current_property_id, 'title', property_row->>'title')
      );
    ELSE
      added_properties := added_properties || jsonb_build_array(
        jsonb_build_object('id', current_property_id, 'title', property_row->>'title')
      );
    END IF;

    -- Manual availability and featured settings are intentionally preserved
    -- for existing references. New rows use their table defaults.
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

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'status', coalesce(p.admin_status_override::text, p.status::text),
        'reason', CASE
          WHEN p.status::text = 'sold' OR p.admin_status_override::text = 'sold' THEN 'sold_preserved'
          ELSE 'already_offline'
        END
      )
      ORDER BY p.id
    ),
    '[]'::jsonb
  )
  INTO ignored_properties
  FROM public.properties AS p
  WHERE p.id <> ALL(feed_property_ids)
    AND (
      p.status::text = 'sold'
      OR p.admin_status_override::text = 'sold'
      OR p.is_online IS FALSE
    );

  WITH offlined AS (
    UPDATE public.properties AS p
    SET is_online = false
    WHERE p.id <> ALL(feed_property_ids)
      AND p.status::text IS DISTINCT FROM 'sold'
      AND p.admin_status_override::text IS DISTINCT FROM 'sold'
      AND p.is_online IS DISTINCT FROM false
    RETURNING p.id, p.title
  )
  SELECT coalesce(
    jsonb_agg(jsonb_build_object('id', offlined.id, 'title', offlined.title, 'reason', 'missing_from_feed') ORDER BY offlined.id),
    '[]'::jsonb
  )
  INTO offlined_properties
  FROM offlined;

  RETURN jsonb_build_object(
    'properties', property_count,
    'images', image_count,
    'features', feature_count,
    'added', added_properties,
    'updated', updated_properties,
    'offline', offlined_properties,
    'ignored', ignored_properties,
    'addedCount', jsonb_array_length(added_properties),
    'updatedCount', jsonb_array_length(updated_properties),
    'offlineCount', jsonb_array_length(offlined_properties),
    'ignoredCount', jsonb_array_length(ignored_properties)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_property_feed(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_property_feed(jsonb) TO service_role;
