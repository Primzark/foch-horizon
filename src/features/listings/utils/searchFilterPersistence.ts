import type { PropertySearchParams } from "@/types/api";
import { buildSearchParams, parseSearchParams } from "@/features/listings/utils/query";

const STORAGE_KEY = "foch_last_applied_property_search_filters";

const hasCriteria = (filters: PropertySearchParams) => Boolean(
  filters.type
  || filters.city
  || filters.q
  || filters.bedroomsMin != null
  || filters.bathroomsMin != null
  || filters.garagesMin != null
  || filters.priceMin != null
  || filters.priceMax != null
  || filters.surfaceMin != null
  || filters.surfaceMax != null
  || filters.terrainMin != null
  || filters.terrainMax != null
  || filters.features?.length,
);

export function hasAppliedPropertySearchPreferences(filters: PropertySearchParams): boolean {
  return hasCriteria(filters) || (filters.sort != null && filters.sort !== "newest");
}

export function readLastAppliedPropertySearchFilters(): PropertySearchParams | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) return undefined;

    const filters = parseSearchParams(new URLSearchParams(serialized));
    return hasAppliedPropertySearchPreferences(filters) ? filters : undefined;
  } catch {
    return undefined;
  }
}

export function persistAppliedPropertySearchFilters(filters: PropertySearchParams): void {
  if (typeof window === "undefined") return;

  try {
    if (!hasAppliedPropertySearchPreferences(filters)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const serialized = buildSearchParams({
      ...filters,
      transaction: "vente",
      page: 1,
      pageSize: 12,
    });
    window.localStorage.setItem(STORAGE_KEY, serialized.toString());
  } catch {
    // Search still works from the URL when browser storage is unavailable.
  }
}

export function resolvePropertySearchFilters(search: string): PropertySearchParams {
  const current = parseSearchParams(new URLSearchParams(search));
  if (hasAppliedPropertySearchPreferences(current)) return current;

  const saved = readLastAppliedPropertySearchFilters();
  const definedCurrent = Object.fromEntries(
    Object.entries(current).filter(([, value]) => value !== undefined),
  ) as PropertySearchParams;
  return saved ? { ...saved, ...definedCurrent } : current;
}
