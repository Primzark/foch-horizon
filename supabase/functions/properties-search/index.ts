import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface PropertyImageRow {
  source_url: string;
  sort_order: number | null;
}

interface PropertyRow {
  id: number;
  title: string;
  slug: string;
  transaction_type: string;
  property_type: string;
  status: string;
  price_amount: number;
  price_currency: string;
  surface_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_count: number | null;
  garage_count: number | null;
  postal_code: string | null;
  dpe_label: string | null;
  city?: {
    name?: string | null;
    slug?: string | null;
  } | null;
  images?: PropertyImageRow[] | null;
}

type SortValue = "newest" | "price_asc" | "price_desc" | "surface_desc";

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.trunc(parsed));
}

function parseNumberParam(value: string | null): number | null {
  if (value == null || value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTerm(value: string): string {
  return value.trim();
}

function dedupeNumbers(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0)));
}

function intersectNumberArrays(left: number[], right: number[]): number[] {
  if (left.length === 0 || right.length === 0) return [];
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

async function collectPropertyIdsForTextQuery(
  supabase: ReturnType<typeof createServiceClient>,
  rawQuery: string,
): Promise<number[]> {
  const q = normalizeTerm(rawQuery);
  if (!q) return [];

  const likePattern = `%${q}%`;
  const collectedIds = new Set<number>();

  for (const field of ["title", "slug", "postal_code"] as const) {
    const { data, error } = await supabase
      .from("properties")
      .select("id")
      .neq("status", "off_market")
      .ilike(field, likePattern)
      .limit(200);

    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: number }>) {
      collectedIds.add(row.id);
    }
  }

  const numericQuery = q.replace(/[^\d]/g, "");
  if (numericQuery.length >= 3) {
    const propertyId = Number(numericQuery);
    if (Number.isInteger(propertyId)) {
      const { data, error } = await supabase
        .from("properties")
        .select("id")
        .neq("status", "off_market")
        .eq("id", propertyId)
        .limit(1);
      if (error) throw error;
      for (const row of (data ?? []) as Array<{ id: number }>) {
        collectedIds.add(row.id);
      }
    }
  }

  const cityIds = new Set<string>();
  for (const field of ["slug", "name"] as const) {
    const { data, error } = await supabase
      .from("cities")
      .select("id")
      .eq("is_active", true)
      .ilike(field, likePattern)
      .limit(50);

    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: string }>) {
      cityIds.add(row.id);
    }
  }

  if (cityIds.size > 0) {
    const { data, error } = await supabase
      .from("properties")
      .select("id")
      .neq("status", "off_market")
      .in("city_id", Array.from(cityIds))
      .limit(400);

    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: number }>) {
      collectedIds.add(row.id);
    }
  }

  return Array.from(collectedIds);
}

async function collectPropertyIdsForFeatureFilters(
  supabase: ReturnType<typeof createServiceClient>,
  rawFeatures: string[],
): Promise<number[] | null> {
  const features = rawFeatures.map(normalizeTerm).filter((value) => value.length > 0);
  if (features.length === 0) return null;

  let matchedIds: number[] | null = null;

  for (const feature of features) {
    const likePattern = `%${feature}%`;
    const termMatches = new Set<number>();

    for (const field of ["feature_key", "label_fr"] as const) {
      const { data, error } = await supabase
        .from("property_features")
        .select("property_id")
        .ilike(field, likePattern)
        .limit(2000);

      if (error) throw error;
      for (const row of (data ?? []) as Array<{ property_id: number }>) {
        termMatches.add(row.property_id);
      }
    }

    const termIds = Array.from(termMatches);
    if (termIds.length === 0) {
      return [];
    }

    matchedIds = matchedIds == null ? termIds : intersectNumberArrays(matchedIds, termIds);

    if (matchedIds.length === 0) {
      return [];
    }
  }

  return matchedIds ?? [];
}

async function resolveCityFilterPropertyIds(
  supabase: ReturnType<typeof createServiceClient>,
  rawCity: string,
): Promise<number[] | null> {
  const cityQuery = normalizeTerm(rawCity);
  if (!cityQuery) return null;

  const exactSlug = cityQuery.toLowerCase();
  const { data: exactCityRows, error: exactCityError } = await supabase
    .from("cities")
    .select("id")
    .eq("is_active", true)
    .eq("slug", exactSlug)
    .limit(20);

  if (exactCityError) throw exactCityError;
  if ((exactCityRows ?? []).length > 0) {
    const cityIds = (exactCityRows as Array<{ id: string }>).map((row) => row.id);
    const { data: exactPropertyRows, error: exactPropertyError } = await supabase
      .from("properties")
      .select("id")
      .neq("status", "off_market")
      .in("city_id", cityIds)
      .limit(4000);

    if (exactPropertyError) throw exactPropertyError;

    return dedupeNumbers(
      (exactPropertyRows ?? []).map((row: { id: number }) => row.id),
    );
  }

  const likePattern = `%${cityQuery}%`;
  const cityIdMatches = new Set<string>();
  const { data: byNameRows, error: byNameError } = await supabase
    .from("cities")
    .select("id")
    .eq("is_active", true)
    .ilike("name", likePattern)
    .limit(50);
  if (byNameError) throw byNameError;
  for (const row of (byNameRows ?? []) as Array<{ id: string }>) cityIdMatches.add(row.id);

  const propertyIds = new Set<number>();
  if (cityIdMatches.size > 0) {
    const { data, error } = await supabase
      .from("properties")
      .select("id")
      .neq("status", "off_market")
      .in("city_id", Array.from(cityIdMatches))
      .limit(4000);
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: number }>) propertyIds.add(row.id);
  }

  const { data: postalRows, error: postalError } = await supabase
    .from("properties")
    .select("id")
    .neq("status", "off_market")
    .ilike("postal_code", likePattern)
    .limit(2000);
  if (postalError) throw postalError;
  for (const row of (postalRows ?? []) as Array<{ id: number }>) propertyIds.add(row.id);

  return Array.from(propertyIds);
}

function applySort(
  query: ReturnType<ReturnType<typeof createServiceClient>["from"]>,
  sort: SortValue | string | null,
) {
  switch (sort) {
    case "price_asc":
      return query.order("price_amount", { ascending: true }).order("published_at", { ascending: false });
    case "price_desc":
      return query.order("price_amount", { ascending: false }).order("published_at", { ascending: false });
    case "surface_desc":
      return query.order("surface_m2", { ascending: false }).order("published_at", { ascending: false });
    case "newest":
    default:
      return query.order("published_at", { ascending: false });
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const url = new URL(request.url);
    const params = url.searchParams;

    const page = parsePositiveInt(params.get("page"), 1);
    const pageSize = Math.min(100, parsePositiveInt(params.get("pageSize"), 24));
    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;
    const sort = params.get("sort");
    const exactSlug = normalizeTerm(params.get("slug") ?? "");
    const features = params.getAll("features");
    const q = normalizeTerm(params.get("q") ?? "");

    let query = supabase
      .from("properties")
      .select(
        "id,title,slug,transaction_type,property_type,status,price_amount,price_currency,surface_m2,bedrooms,bathrooms,parking_count,garage_count,postal_code,dpe_label,city:cities(name,slug),images:property_images(source_url,sort_order)",
        { count: "exact" },
      )
      .neq("status", "off_market")
      .range(from, to);

    if (exactSlug) {
      query = query.eq("slug", exactSlug);
    }

    const transaction = params.get("transaction");
    if (transaction) query = query.eq("transaction_type", transaction);

    const type = params.get("type");
    if (type) query = query.eq("property_type", type);

    const city = params.get("city");
    if (city) {
      const cityPropertyIds = await resolveCityFilterPropertyIds(supabase, city);
      if (cityPropertyIds && cityPropertyIds.length === 0) {
        return jsonResponse({ page, pageSize, total: 0, items: [] });
      }
      if (cityPropertyIds && cityPropertyIds.length > 0) {
        query = query.in("id", dedupeNumbers(cityPropertyIds));
      }
    }

    const minPrice = parseNumberParam(params.get("priceMin"));
    if (minPrice != null) query = query.gte("price_amount", minPrice);

    const maxPrice = parseNumberParam(params.get("priceMax"));
    if (maxPrice != null) query = query.lte("price_amount", maxPrice);

    const bedroomsMin = parseNumberParam(params.get("bedroomsMin"));
    if (bedroomsMin != null) query = query.gte("bedrooms", bedroomsMin);

    const bathroomsMin = parseNumberParam(params.get("bathroomsMin"));
    if (bathroomsMin != null) query = query.gte("bathrooms", bathroomsMin);

    const garagesMin = parseNumberParam(params.get("garagesMin"));
    if (garagesMin != null) query = query.gte("garage_count", garagesMin);

    const surfaceMin = parseNumberParam(params.get("surfaceMin"));
    if (surfaceMin != null) query = query.gte("surface_m2", surfaceMin);

    const terrainMin = parseNumberParam(params.get("terrainMin"));
    if (terrainMin != null) query = query.gte("terrain_m2", terrainMin);

    if (q) {
      const matchingIds = dedupeNumbers(await collectPropertyIdsForTextQuery(supabase, q));
      if (matchingIds.length === 0) {
        return jsonResponse({ page, pageSize, total: 0, items: [] });
      }
      query = query.in("id", matchingIds);
    }

    if (features.length > 0) {
      const featureIds = await collectPropertyIdsForFeatureFilters(supabase, features);
      if (featureIds && featureIds.length === 0) {
        return jsonResponse({ page, pageSize, total: 0, items: [] });
      }
      if (featureIds && featureIds.length > 0) {
        query = query.in("id", dedupeNumbers(featureIds));
      }
    }

    query = applySort(query, sort);

    const { data, error, count } = await query;
    if (error) throw error;

    const items = (data as PropertyRow[] | null ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      transaction: item.transaction_type,
      type: item.property_type,
      priceAmount: item.price_amount,
      currency: item.price_currency,
      surfaceM2: item.surface_m2,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      parking: item.parking_count,
      garage: item.garage_count,
      city: {
        name: item.city?.name ?? "",
        slug: item.city?.slug ?? "",
        postalCode: item.postal_code ?? "",
      },
      coverImageUrl:
        item.images?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.source_url ?? "",
      dpeLabel: item.dpe_label,
      status: item.status,
    }));

    return jsonResponse({
      page,
      pageSize,
      total: count ?? items.length,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
