import type { PropertySearchParams } from "@/types/api";
import type { PropertyType, TransactionType } from "@/types/domain";

const TRANSACTION_VALUES: TransactionType[] = ["vente", "location"];
const TYPE_VALUES: PropertyType[] = ["appartement", "maison_villa", "autre"];
const ALLOWED_PAGE_SIZES = new Set([12, 24, 48]);
const DEFAULT_LISTINGS_PAGE_SIZE = 12;

function toNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPositiveInteger(value: string | null): number | undefined {
  const parsed = toNumber(value);
  if (parsed == null) return undefined;
  const integer = Math.trunc(parsed);
  return integer > 0 ? integer : undefined;
}

function toListingsPageSize(value: string | null): number | undefined {
  const parsed = toPositiveInteger(value);
  if (parsed == null) return undefined;
  return ALLOWED_PAGE_SIZES.has(parsed) ? parsed : undefined;
}

function toEnum<T extends string>(value: string | null, options: readonly T[]): T | undefined {
  if (!value) {
    return undefined;
  }

  return (options as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseSearchParams(searchParams: URLSearchParams): PropertySearchParams {
  const features = searchParams.getAll("features").filter(Boolean);
  const parsed: PropertySearchParams = {
    transaction: toEnum(searchParams.get("transaction"), TRANSACTION_VALUES),
    type: toEnum(searchParams.get("type"), TYPE_VALUES),
    city: searchParams.get("city") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    bedroomsMin: toNumber(searchParams.get("bedroomsMin")),
    bathroomsMin: toNumber(searchParams.get("bathroomsMin")),
    garagesMin: toNumber(searchParams.get("garagesMin")),
    priceMin: toNumber(searchParams.get("priceMin")),
    priceMax: toNumber(searchParams.get("priceMax")),
    surfaceMin: toNumber(searchParams.get("surfaceMin")),
    surfaceMax: toNumber(searchParams.get("surfaceMax")),
    terrainMin: toNumber(searchParams.get("terrainMin")),
    terrainMax: toNumber(searchParams.get("terrainMax")),
    features: features.length > 0 ? features : undefined,
    page: toPositiveInteger(searchParams.get("page")),
    pageSize: toListingsPageSize(searchParams.get("pageSize")),
    sort: (searchParams.get("sort") as PropertySearchParams["sort"]) ?? undefined,
  };

  if (parsed.priceMin != null && parsed.priceMax != null && parsed.priceMin > parsed.priceMax) {
    [parsed.priceMin, parsed.priceMax] = [parsed.priceMax, parsed.priceMin];
  }
  if (parsed.surfaceMin != null && parsed.surfaceMax != null && parsed.surfaceMin > parsed.surfaceMax) {
    [parsed.surfaceMin, parsed.surfaceMax] = [parsed.surfaceMax, parsed.surfaceMin];
  }
  if (parsed.terrainMin != null && parsed.terrainMax != null && parsed.terrainMin > parsed.terrainMax) {
    [parsed.terrainMin, parsed.terrainMax] = [parsed.terrainMax, parsed.terrainMin];
  }

  return parsed;
}

export function buildSearchParams(params: PropertySearchParams): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (params.transaction) searchParams.set("transaction", params.transaction);
  if (params.type) searchParams.set("type", params.type);
  if (params.city) searchParams.set("city", params.city);
  if (params.q) searchParams.set("q", params.q);
  if (params.bedroomsMin != null) searchParams.set("bedroomsMin", String(params.bedroomsMin));
  if (params.bathroomsMin != null) searchParams.set("bathroomsMin", String(params.bathroomsMin));
  if (params.garagesMin != null) searchParams.set("garagesMin", String(params.garagesMin));
  if (params.priceMin != null) searchParams.set("priceMin", String(params.priceMin));
  if (params.priceMax != null) searchParams.set("priceMax", String(params.priceMax));
  if (params.surfaceMin != null) searchParams.set("surfaceMin", String(params.surfaceMin));
  if (params.surfaceMax != null) searchParams.set("surfaceMax", String(params.surfaceMax));
  if (params.terrainMin != null) searchParams.set("terrainMin", String(params.terrainMin));
  if (params.terrainMax != null) searchParams.set("terrainMax", String(params.terrainMax));
  if (params.features) {
    params.features.forEach((feature) => searchParams.append("features", feature));
  }
  if (params.page != null) searchParams.set("page", String(Math.max(1, Math.trunc(params.page))));
  if (
    params.pageSize != null &&
    ALLOWED_PAGE_SIZES.has(Math.trunc(params.pageSize)) &&
    Math.trunc(params.pageSize) !== DEFAULT_LISTINGS_PAGE_SIZE
  ) {
    searchParams.set("pageSize", String(Math.trunc(params.pageSize)));
  }
  if (params.sort) searchParams.set("sort", params.sort);

  return searchParams;
}
