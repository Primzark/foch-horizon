import { createServiceClient } from "./client.ts";

export interface SharedPropertySearchQueryParams {
  slug?: string;
  transaction?: string;
  type?: string;
  city?: string;
  q?: string;
  bedroomsMin?: number | null;
  bathroomsMin?: number | null;
  garagesMin?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  surfaceMin?: number | null;
  surfaceMax?: number | null;
  terrainMin?: number | null;
  terrainMax?: number | null;
  features?: string[];
  page?: number;
  pageSize?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "surface_desc" | string | null;
}

export interface SharedPropertyImageRow {
  source_url: string;
  sort_order: number | null;
}

export interface SharedPropertySearchRow {
  id: number;
  title: string;
  slug: string;
  transaction_type: string;
  property_type: string;
  status: string;
  price_amount: number;
  price_currency: string;
  surface_m2: number | null;
  terrain_m2?: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_count?: number | null;
  garage_count: number | null;
  postal_code: string | null;
  dpe_label: string | null;
  city?: {
    name?: string | null;
    slug?: string | null;
  } | null;
  images?: SharedPropertyImageRow[] | null;
}

type SortValue = "newest" | "price_asc" | "price_desc" | "surface_desc";

type ServiceClient = ReturnType<typeof createServiceClient>;

function normalizeTerm(value: string): string {
  return value.trim();
}

function parsePositiveInt(value: number | null | undefined, fallback: number): number {
  if (value == null) return fallback;
  if (!Number.isFinite(value)) return fallback;
  const integer = Math.trunc(value);
  return integer > 0 ? integer : fallback;
}

export function dedupePositiveIntegers(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0)));
}

function intersectNumberArrays(left: number[], right: number[]): number[] {
  if (left.length === 0 || right.length === 0) return [];
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

export async function collectPropertyIdsForTextQuery(
  supabase: ServiceClient,
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
      for (const row of (data ?? []) as Array<{ id: number }>) collectedIds.add(row.id);
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
    for (const row of (data ?? []) as Array<{ id: string }>) cityIds.add(row.id);
  }

  if (cityIds.size > 0) {
    const { data, error } = await supabase
      .from("properties")
      .select("id")
      .neq("status", "off_market")
      .in("city_id", Array.from(cityIds))
      .limit(400);
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: number }>) collectedIds.add(row.id);
  }

  return Array.from(collectedIds);
}

export async function collectPropertyIdsForFeatureFilters(
  supabase: ServiceClient,
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
    if (termIds.length === 0) return [];

    matchedIds = matchedIds == null ? termIds : intersectNumberArrays(matchedIds, termIds);
    if (matchedIds.length === 0) return [];
  }

  return matchedIds ?? [];
}

export async function resolveCityFilterPropertyIds(
  supabase: ServiceClient,
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
    return dedupePositiveIntegers((exactPropertyRows ?? []).map((row: { id: number }) => row.id));
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
  query: any,
  sort: SortValue | string | null | undefined,
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

export interface SharedPropertySearchQueryOptions {
  defaultPageSize?: number;
  minPageSizeWithoutSlug?: number;
  maxPageSize?: number;
}

export interface SharedPropertySearchQueryResult {
  page: number;
  pageSize: number;
  total: number;
  rows: SharedPropertySearchRow[];
}

export async function runSharedPropertySearchQuery(
  supabase: ServiceClient,
  input: SharedPropertySearchQueryParams,
  options: SharedPropertySearchQueryOptions = {},
): Promise<SharedPropertySearchQueryResult> {
  const exactSlug = normalizeTerm(input.slug ?? "");
  const page = parsePositiveInt(input.page ?? null, 1);
  const requestedPageSize = parsePositiveInt(input.pageSize ?? null, options.defaultPageSize ?? 24);
  const maxPageSize = Math.max(1, Math.trunc(options.maxPageSize ?? 100));
  const minWithoutSlug = Math.max(1, Math.trunc(options.minPageSizeWithoutSlug ?? 1));
  const pageSize = exactSlug
    ? Math.min(maxPageSize, requestedPageSize)
    : Math.min(maxPageSize, Math.max(minWithoutSlug, requestedPageSize));
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;
  const features = (input.features ?? []).map((value) => String(value)).filter(Boolean);
  const q = normalizeTerm(input.q ?? "");

  let query = supabase
    .from("properties")
    .select(
      "id,title,slug,transaction_type,property_type,status,price_amount,price_currency,surface_m2,terrain_m2,bedrooms,bathrooms,parking_count,garage_count,postal_code,dpe_label,city:cities(name,slug),images:property_images(source_url,sort_order)",
      { count: "exact" },
    )
    .neq("status", "off_market")
    .range(from, to);

  if (exactSlug) {
    query = query.eq("slug", exactSlug);
  }

  if (input.transaction) query = query.eq("transaction_type", input.transaction);
  if (input.type) query = query.eq("property_type", input.type);

  if (input.city) {
    const cityPropertyIds = await resolveCityFilterPropertyIds(supabase, input.city);
    if (cityPropertyIds && cityPropertyIds.length === 0) {
      return { page, pageSize, total: 0, rows: [] };
    }
    if (cityPropertyIds && cityPropertyIds.length > 0) {
      query = query.in("id", dedupePositiveIntegers(cityPropertyIds));
    }
  }

  if (typeof input.priceMin === "number" && Number.isFinite(input.priceMin)) query = query.gte("price_amount", input.priceMin);
  if (typeof input.priceMax === "number" && Number.isFinite(input.priceMax)) query = query.lte("price_amount", input.priceMax);
  if (typeof input.bedroomsMin === "number" && Number.isFinite(input.bedroomsMin)) query = query.gte("bedrooms", input.bedroomsMin);
  if (typeof input.bathroomsMin === "number" && Number.isFinite(input.bathroomsMin)) query = query.gte("bathrooms", input.bathroomsMin);
  if (typeof input.garagesMin === "number" && Number.isFinite(input.garagesMin)) query = query.gte("garage_count", input.garagesMin);
  if (typeof input.surfaceMin === "number" && Number.isFinite(input.surfaceMin)) query = query.gte("surface_m2", input.surfaceMin);
  if (typeof input.surfaceMax === "number" && Number.isFinite(input.surfaceMax)) query = query.lte("surface_m2", input.surfaceMax);
  if (typeof input.terrainMin === "number" && Number.isFinite(input.terrainMin)) query = query.gte("terrain_m2", input.terrainMin);
  if (typeof input.terrainMax === "number" && Number.isFinite(input.terrainMax)) query = query.lte("terrain_m2", input.terrainMax);

  if (q) {
    const matchingIds = dedupePositiveIntegers(await collectPropertyIdsForTextQuery(supabase, q));
    if (matchingIds.length === 0) {
      return { page, pageSize, total: 0, rows: [] };
    }
    query = query.in("id", matchingIds);
  }

  if (features.length > 0) {
    const featureIds = await collectPropertyIdsForFeatureFilters(supabase, features);
    if (featureIds && featureIds.length === 0) {
      return { page, pageSize, total: 0, rows: [] };
    }
    if (featureIds && featureIds.length > 0) {
      query = query.in("id", dedupePositiveIntegers(featureIds));
    }
  }

  query = applySort(query, input.sort);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    page,
    pageSize,
    total: count ?? (Array.isArray(data) ? data.length : 0),
    rows: (data as SharedPropertySearchRow[] | null) ?? [],
  };
}

export interface SharedPropertyAggregateMetrics {
  count: number;
  excludedSurfaceCount: number;
  excludedPricePerM2Count: number;
  avgSurfaceM2: number | null;
  medianSurfaceM2: number | null;
  minSurfaceM2: number | null;
  maxSurfaceM2: number | null;
  avgPrice: number | null;
  medianPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  avgPricePerM2: number | null;
}

export interface SharedPropertyAggregateBucket {
  key: string;
  label: string;
  count: number;
  avgPrice: number | null;
  avgSurfaceM2: number | null;
}

export interface SharedPropertyAggregateRow {
  id: number;
  transaction_type: string;
  property_type: string;
  price_amount: number;
  surface_m2: number | null;
  city?: { name?: string | null; slug?: string | null } | null;
}

export interface SharedPropertyAggregateBreakdowns {
  byTransaction: SharedPropertyAggregateBucket[];
  byType: SharedPropertyAggregateBucket[];
  topCities: SharedPropertyAggregateBucket[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupAggregateBuckets(
  rows: SharedPropertyAggregateRow[],
  keyFn: (row: SharedPropertyAggregateRow) => string,
  labelFn: (row: SharedPropertyAggregateRow) => string,
  limit?: number,
): SharedPropertyAggregateBucket[] {
  const groups = new Map<string, { label: string; rows: SharedPropertyAggregateRow[] }>();
  for (const row of rows) {
    const key = keyFn(row).trim();
    if (!key) continue;
    const current = groups.get(key) ?? { label: labelFn(row).trim() || key, rows: [] };
    current.rows.push(row);
    groups.set(key, current);
  }
  const buckets = Array.from(groups.entries()).map(([key, value]) => {
    const prices = value.rows.map((r) => r.price_amount).filter((v) => Number.isFinite(v));
    const surfaces = value.rows
      .map((r) => r.surface_m2)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
    return {
      key,
      label: value.label,
      count: value.rows.length,
      avgPrice: avg(prices),
      avgSurfaceM2: avg(surfaces),
    } satisfies SharedPropertyAggregateBucket;
  });

  buckets.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
  return typeof limit === "number" ? buckets.slice(0, Math.max(0, limit)) : buckets;
}

export function computeSharedPropertyAggregateMetrics(rows: SharedPropertyAggregateRow[]): {
  metrics: SharedPropertyAggregateMetrics;
  breakdowns: SharedPropertyAggregateBreakdowns;
} {
  const priceValues = rows
    .map((row) => row.price_amount)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  const surfaceValues = rows
    .map((row) => row.surface_m2)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
  const pricePerM2Values = rows
    .map((row) =>
      typeof row.surface_m2 === "number" && Number.isFinite(row.surface_m2) && row.surface_m2 > 0 && row.price_amount > 0
        ? row.price_amount / row.surface_m2
        : null)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);

  const metrics: SharedPropertyAggregateMetrics = {
    count: rows.length,
    excludedSurfaceCount: Math.max(0, rows.length - surfaceValues.length),
    excludedPricePerM2Count: Math.max(0, rows.length - pricePerM2Values.length),
    avgSurfaceM2: avg(surfaceValues),
    medianSurfaceM2: median(surfaceValues),
    minSurfaceM2: surfaceValues.length > 0 ? Math.min(...surfaceValues) : null,
    maxSurfaceM2: surfaceValues.length > 0 ? Math.max(...surfaceValues) : null,
    avgPrice: avg(priceValues),
    medianPrice: median(priceValues),
    minPrice: priceValues.length > 0 ? Math.min(...priceValues) : null,
    maxPrice: priceValues.length > 0 ? Math.max(...priceValues) : null,
    avgPricePerM2: avg(pricePerM2Values),
  };

  const breakdowns: SharedPropertyAggregateBreakdowns = {
    byTransaction: groupAggregateBuckets(rows, (row) => row.transaction_type ?? "", (row) => row.transaction_type ?? ""),
    byType: groupAggregateBuckets(rows, (row) => row.property_type ?? "", (row) => row.property_type ?? ""),
    topCities: groupAggregateBuckets(
      rows,
      (row) => (row.city?.slug ?? "").trim(),
      (row) => (row.city?.name ?? row.city?.slug ?? "").trim(),
      5,
    ),
  };

  return { metrics, breakdowns };
}

export async function fetchAggregateRowsForSearchFilters(
  supabase: ServiceClient,
  input: Omit<SharedPropertySearchQueryParams, "page" | "pageSize" | "sort" | "slug">,
): Promise<SharedPropertyAggregateRow[]> {
  let query = supabase
    .from("properties")
    .select("id,transaction_type,property_type,price_amount,surface_m2,city:cities(name,slug)")
    .neq("status", "off_market");

  if (input.transaction) query = query.eq("transaction_type", input.transaction);
  if (input.type) query = query.eq("property_type", input.type);
  if (typeof input.priceMin === "number" && Number.isFinite(input.priceMin)) query = query.gte("price_amount", input.priceMin);
  if (typeof input.priceMax === "number" && Number.isFinite(input.priceMax)) query = query.lte("price_amount", input.priceMax);
  if (typeof input.bedroomsMin === "number" && Number.isFinite(input.bedroomsMin)) query = query.gte("bedrooms", input.bedroomsMin);
  if (typeof input.bathroomsMin === "number" && Number.isFinite(input.bathroomsMin)) query = query.gte("bathrooms", input.bathroomsMin);
  if (typeof input.garagesMin === "number" && Number.isFinite(input.garagesMin)) query = query.gte("garage_count", input.garagesMin);
  if (typeof input.surfaceMin === "number" && Number.isFinite(input.surfaceMin)) query = query.gte("surface_m2", input.surfaceMin);
  if (typeof input.surfaceMax === "number" && Number.isFinite(input.surfaceMax)) query = query.lte("surface_m2", input.surfaceMax);
  if (typeof input.terrainMin === "number" && Number.isFinite(input.terrainMin)) query = query.gte("terrain_m2", input.terrainMin);
  if (typeof input.terrainMax === "number" && Number.isFinite(input.terrainMax)) query = query.lte("terrain_m2", input.terrainMax);

  if (input.city) {
    const cityPropertyIds = await resolveCityFilterPropertyIds(supabase, input.city);
    if (cityPropertyIds && cityPropertyIds.length === 0) return [];
    if (cityPropertyIds && cityPropertyIds.length > 0) query = query.in("id", dedupePositiveIntegers(cityPropertyIds));
  }

  const q = normalizeTerm(input.q ?? "");
  if (q) {
    const matchingIds = dedupePositiveIntegers(await collectPropertyIdsForTextQuery(supabase, q));
    if (matchingIds.length === 0) return [];
    query = query.in("id", matchingIds);
  }

  const features = (input.features ?? []).map((value) => String(value)).filter(Boolean);
  if (features.length > 0) {
    const featureIds = await collectPropertyIdsForFeatureFilters(supabase, features);
    if (featureIds && featureIds.length === 0) return [];
    if (featureIds && featureIds.length > 0) query = query.in("id", dedupePositiveIntegers(featureIds));
  }

  const { data, error } = await query.limit(5000);
  if (error) throw error;
  return ((data as SharedPropertyAggregateRow[] | null) ?? []).filter((row) => typeof row.id === "number");
}

export async function fetchAggregateRowsByIds(
  supabase: ServiceClient,
  propertyIds: number[],
): Promise<SharedPropertyAggregateRow[]> {
  const ids = dedupePositiveIntegers(propertyIds).slice(0, 50);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("properties")
    .select("id,transaction_type,property_type,price_amount,surface_m2,city:cities(name,slug)")
    .in("id", ids)
    .neq("status", "off_market");
  if (error) throw error;
  const rows = ((data as SharedPropertyAggregateRow[] | null) ?? []).filter((row) => typeof row.id === "number");
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is SharedPropertyAggregateRow => Boolean(row));
}
