import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  computeSharedPropertyAggregateMetrics,
  fetchAggregateRowsByIds,
  fetchAggregateRowsForSearchFilters,
  type SharedPropertySearchQueryParams,
} from "../_shared/property-search.ts";

type AggregateScope = "current_filtered" | "global_active_inventory" | "selected_properties";

function parseNumberParam(value: string | null): number | null {
  if (value == null || value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSort(value: string | null): SharedPropertySearchQueryParams["sort"] {
  if (!value) return undefined;
  if (value === "newest" || value === "price_asc" || value === "price_desc" || value === "surface_desc") return value;
  return undefined;
}

function parseScope(value: string | null | undefined): AggregateScope | undefined {
  if (!value) return undefined;
  if (value === "current_filtered" || value === "global_active_inventory" || value === "selected_properties") return value;
  return undefined;
}

function parsePropertyIds(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "number" ? item : Number(item)))
      .filter((item) => Number.isInteger(item) && item > 0)
      .slice(0, 50) as number[];
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
      .slice(0, 50);
  }
  return [];
}

function parseFeatures(values: string[] | null | undefined): string[] | undefined {
  const list = (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
  return list.length > 0 ? Array.from(new Set(list)) : undefined;
}

function sanitizeSearchParams(input: SharedPropertySearchQueryParams): SharedPropertySearchQueryParams {
  const params: SharedPropertySearchQueryParams = {
    transaction: input.transaction,
    type: input.type,
    city: typeof input.city === "string" ? input.city.trim().slice(0, 80) : undefined,
    q: typeof input.q === "string" ? input.q.trim().slice(0, 120) : undefined,
    bedroomsMin: typeof input.bedroomsMin === "number" && Number.isFinite(input.bedroomsMin) ? Math.max(0, Math.floor(input.bedroomsMin)) : undefined,
    bathroomsMin: typeof input.bathroomsMin === "number" && Number.isFinite(input.bathroomsMin) ? Math.max(0, Math.floor(input.bathroomsMin)) : undefined,
    garagesMin: typeof input.garagesMin === "number" && Number.isFinite(input.garagesMin) ? Math.max(0, Math.floor(input.garagesMin)) : undefined,
    priceMin: typeof input.priceMin === "number" && Number.isFinite(input.priceMin) ? Math.max(0, Math.floor(input.priceMin)) : undefined,
    priceMax: typeof input.priceMax === "number" && Number.isFinite(input.priceMax) ? Math.max(0, Math.floor(input.priceMax)) : undefined,
    surfaceMin: typeof input.surfaceMin === "number" && Number.isFinite(input.surfaceMin) ? Math.max(0, input.surfaceMin) : undefined,
    surfaceMax: typeof input.surfaceMax === "number" && Number.isFinite(input.surfaceMax) ? Math.max(0, input.surfaceMax) : undefined,
    terrainMin: typeof input.terrainMin === "number" && Number.isFinite(input.terrainMin) ? Math.max(0, input.terrainMin) : undefined,
    terrainMax: typeof input.terrainMax === "number" && Number.isFinite(input.terrainMax) ? Math.max(0, input.terrainMax) : undefined,
    features: parseFeatures(input.features),
    sort: parseSort(typeof input.sort === "string" ? input.sort : null),
  };

  if (typeof params.priceMin === "number" && typeof params.priceMax === "number" && params.priceMin > params.priceMax) {
    [params.priceMin, params.priceMax] = [params.priceMax, params.priceMin];
  }
  if (typeof params.surfaceMin === "number" && typeof params.surfaceMax === "number" && params.surfaceMin > params.surfaceMax) {
    [params.surfaceMin, params.surfaceMax] = [params.surfaceMax, params.surfaceMin];
  }
  if (typeof params.terrainMin === "number" && typeof params.terrainMax === "number" && params.terrainMin > params.terrainMax) {
    [params.terrainMin, params.terrainMax] = [params.terrainMax, params.terrainMin];
  }

  return params;
}

async function parseRequestInput(request: Request): Promise<{
  scope?: AggregateScope;
  searchParams: SharedPropertySearchQueryParams;
  propertyIds: number[];
}> {
  const url = new URL(request.url);
  const query = url.searchParams;

  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    try {
      const raw = await request.json();
      if (raw && typeof raw === "object" && !Array.isArray(raw)) body = raw as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  const bodySearchParams =
    body.searchParams && typeof body.searchParams === "object" && !Array.isArray(body.searchParams)
      ? (body.searchParams as Record<string, unknown>)
      : {};

  const searchParams = sanitizeSearchParams({
    transaction:
      (bodySearchParams.transaction as string | undefined) ??
      (query.get("transaction") || undefined),
    type:
      (bodySearchParams.type as string | undefined) ??
      (query.get("type") || undefined),
    city:
      (bodySearchParams.city as string | undefined) ??
      (query.get("city") || undefined),
    q:
      (bodySearchParams.q as string | undefined) ??
      (query.get("q") || undefined),
    bedroomsMin:
      typeof bodySearchParams.bedroomsMin === "number" ? bodySearchParams.bedroomsMin : parseNumberParam(query.get("bedroomsMin")),
    bathroomsMin:
      typeof bodySearchParams.bathroomsMin === "number" ? bodySearchParams.bathroomsMin : parseNumberParam(query.get("bathroomsMin")),
    garagesMin:
      typeof bodySearchParams.garagesMin === "number" ? bodySearchParams.garagesMin : parseNumberParam(query.get("garagesMin")),
    priceMin:
      typeof bodySearchParams.priceMin === "number" ? bodySearchParams.priceMin : parseNumberParam(query.get("priceMin")),
    priceMax:
      typeof bodySearchParams.priceMax === "number" ? bodySearchParams.priceMax : parseNumberParam(query.get("priceMax")),
    surfaceMin:
      typeof bodySearchParams.surfaceMin === "number" ? bodySearchParams.surfaceMin : parseNumberParam(query.get("surfaceMin")),
    surfaceMax:
      typeof bodySearchParams.surfaceMax === "number" ? bodySearchParams.surfaceMax : parseNumberParam(query.get("surfaceMax")),
    terrainMin:
      typeof bodySearchParams.terrainMin === "number" ? bodySearchParams.terrainMin : parseNumberParam(query.get("terrainMin")),
    terrainMax:
      typeof bodySearchParams.terrainMax === "number" ? bodySearchParams.terrainMax : parseNumberParam(query.get("terrainMax")),
    features:
      Array.isArray(bodySearchParams.features)
        ? (bodySearchParams.features as unknown[]).map((value) => String(value))
        : query.getAll("features"),
    sort:
      (bodySearchParams.sort as string | undefined) ??
      query.get("sort"),
  });

  const propertyIds = parsePropertyIds(body.propertyIds ?? query.get("propertyIds"));
  const scope =
    parseScope((body.scope as string | undefined) ?? query.get("scope")) ??
    (propertyIds.length > 0
      ? "selected_properties"
      : (searchParams.transaction ||
          searchParams.type ||
          searchParams.city ||
          searchParams.q ||
          searchParams.bedroomsMin != null ||
          searchParams.bathroomsMin != null ||
          searchParams.garagesMin != null ||
          searchParams.priceMin != null ||
          searchParams.priceMax != null ||
          searchParams.surfaceMin != null ||
          searchParams.surfaceMax != null ||
          searchParams.terrainMin != null ||
          searchParams.terrainMax != null ||
          (searchParams.features?.length ?? 0) > 0)
        ? "current_filtered"
        : "global_active_inventory");

  return { scope, searchParams, propertyIds };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createServiceClient();
    const { scope, searchParams, propertyIds } = await parseRequestInput(request);

    const rows =
      scope === "selected_properties"
        ? await fetchAggregateRowsByIds(supabase, propertyIds)
        : await fetchAggregateRowsForSearchFilters(supabase, searchParams);

    const { metrics, breakdowns } = computeSharedPropertyAggregateMetrics(rows);

    return jsonResponse({
      ok: true,
      scope,
      criteria: searchParams,
      selectedPropertyIds: scope === "selected_properties" ? propertyIds : undefined,
      metrics,
      breakdowns,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
