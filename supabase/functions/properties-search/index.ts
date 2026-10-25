import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { runSharedPropertySearchQuery } from "../_shared/property-search.ts";

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
  admin_status_override: string | null;
  is_featured?: boolean;
  source_status: string | null;
  description?: string | null;
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

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value == null) return fallback;
  const normalized = value.trim();
  if (normalized.length === 0) return fallback;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;

  const integer = Math.trunc(parsed);
  return integer > 0 ? integer : fallback;
}

function parseNumberParam(value: string | null): number | null {
  if (value == null || value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const url = new URL(request.url);
    const params = url.searchParams;
    const includeDescription = params.get("includeDescription") === "true";
    const searchResult = await runSharedPropertySearchQuery(
      supabase,
      {
        slug: params.get("slug") ?? undefined,
        transaction: params.get("transaction") ?? undefined,
        status: params.get("status") === "sold" ? "sold" : undefined,
        featuredOnly: params.get("featuredOnly") === "true",
        type: params.get("type") ?? undefined,
        city: params.get("city") ?? undefined,
        q: params.get("q") ?? undefined,
        bedroomsMin: parseNumberParam(params.get("bedroomsMin")),
        bathroomsMin: parseNumberParam(params.get("bathroomsMin")),
        garagesMin: parseNumberParam(params.get("garagesMin")),
        priceMin: parseNumberParam(params.get("priceMin")),
        priceMax: parseNumberParam(params.get("priceMax")),
        surfaceMin: parseNumberParam(params.get("surfaceMin")),
        surfaceMax: parseNumberParam(params.get("surfaceMax")),
        terrainMin: parseNumberParam(params.get("terrainMin")),
        terrainMax: parseNumberParam(params.get("terrainMax")),
        features: params.getAll("features"),
        page: parsePositiveInt(params.get("page"), 1),
        pageSize: parsePositiveInt(params.get("pageSize"), 24),
        sort: params.get("sort"),
      },
      {
        defaultPageSize: 24,
        minPageSizeWithoutSlug: 12,
        maxPageSize: 100,
        includeDescription,
      },
    );

    const items = (searchResult.rows as PropertyRow[]).map((item) => {
      const imageUrls = [...(item.images ?? [])]
        .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
        .map((image) => image.source_url)
        .filter(Boolean);

      return {
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
        coverImageUrl: imageUrls[0] ?? "",
        imageUrls,
        ...(includeDescription ? { description: item.description ?? "" } : {}),
        dpeLabel: item.dpe_label,
        status: item.status,
        adminStatusOverride: item.admin_status_override,
        sourceStatus: item.source_status,
      };
    });

    return jsonResponse({
      page: searchResult.page,
      pageSize: searchResult.pageSize,
      total: searchResult.total ?? items.length,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
