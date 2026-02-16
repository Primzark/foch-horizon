import type { PropertySearchParams } from "@/types/api";
import type { PropertyType, TransactionType } from "@/types/domain";

const TRANSACTION_VALUES: TransactionType[] = ["vente", "location"];
const TYPE_VALUES: PropertyType[] = ["appartement", "maison_villa", "autre"];

function toNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toEnum<T extends string>(value: string | null, options: readonly T[]): T | undefined {
  if (!value) {
    return undefined;
  }

  return (options as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseSearchParams(searchParams: URLSearchParams): PropertySearchParams {
  const features = searchParams.getAll("features").filter(Boolean);

  return {
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
    terrainMin: toNumber(searchParams.get("terrainMin")),
    features: features.length > 0 ? features : undefined,
    page: toNumber(searchParams.get("page")),
    pageSize: toNumber(searchParams.get("pageSize")),
    sort: (searchParams.get("sort") as PropertySearchParams["sort"]) ?? undefined,
  };
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
  if (params.terrainMin != null) searchParams.set("terrainMin", String(params.terrainMin));
  if (params.features) {
    params.features.forEach((feature) => searchParams.append("features", feature));
  }
  if (params.page != null) searchParams.set("page", String(params.page));
  if (params.pageSize != null) searchParams.set("pageSize", String(params.pageSize));
  if (params.sort) searchParams.set("sort", params.sort);

  return searchParams;
}
