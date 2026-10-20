import type { PropertySearchParams } from "@/types/api";

export type PropertyAlertCriteria = Omit<PropertySearchParams, "page" | "pageSize" | "sort">;

/** Keep the search filters while excluding view state that cannot affect a match. */
export function toPropertyAlertCriteria(filters: PropertySearchParams): PropertyAlertCriteria {
  const criteria: PropertyAlertCriteria = {};

  if (filters.transaction) criteria.transaction = filters.transaction;
  if (filters.type) criteria.type = filters.type;
  if (filters.city?.trim()) criteria.city = filters.city.trim();
  if (filters.q?.trim()) criteria.q = filters.q.trim();

  const numericKeys = [
    "bedroomsMin",
    "bathroomsMin",
    "garagesMin",
    "priceMin",
    "priceMax",
    "surfaceMin",
    "surfaceMax",
    "terrainMin",
    "terrainMax",
  ] as const;
  for (const key of numericKeys) {
    if (filters[key] != null && Number.isFinite(filters[key])) {
      criteria[key] = filters[key];
    }
  }

  const features = [...new Set((filters.features ?? []).map((feature) => feature.trim()).filter(Boolean))].sort();
  if (features.length > 0) criteria.features = features;

  return criteria;
}
