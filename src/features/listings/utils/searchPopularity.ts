import { listingLocationOptions } from "@/features/listings/data/listingLocationOptions";
import { featureOptions, propertyTypeOptions } from "@/features/listings/data/options";
import { normalizeKeyword } from "@/features/listings/utils/formatting";
import type { PropertySearchParams } from "@/types/api";

export interface SearchPopularityCandidate {
  key: string;
  label: string;
  filters: Partial<PropertySearchParams>;
}

export const fallbackSearchKeys = [
  "location:le-havre",
  "location:sainte-adresse",
  "feature:vue_mer",
  "type:maison_villa",
] as const;

export const searchPopularityCandidates: SearchPopularityCandidate[] = [
  ...listingLocationOptions.map((area) => ({
    key: `location:${area.id}`,
    label: area.name,
    filters: {
      ...(area.city ? { city: area.city } : {}),
      ...(area.query ? { q: area.query } : {}),
    },
  })),
  ...propertyTypeOptions.map((type) => ({
    key: `type:${type.value}`,
    label: type.value === "maison_villa" ? "Maison" : type.label,
    filters: { type: type.value },
  })),
  ...featureOptions.map((feature) => ({
    key: `feature:${feature.value}`,
    label: feature.label,
    filters: { features: [feature.value] },
  })),
];

const candidatesByKey = new Map(searchPopularityCandidates.map((candidate) => [candidate.key, candidate]));
const normalized = (value: string) => normalizeKeyword(value).replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim();

function findLocationKey(value: string): string | undefined {
  const term = normalized(value);
  if (!term) return undefined;

  const match = listingLocationOptions.find((area) =>
    [area.name, area.query, area.id.replace(/-/g, " ")]
      .filter((entry): entry is string => Boolean(entry))
      .some((entry) => normalized(entry) === term),
  );
  if (match) return `location:${match.id}`;

  // “Havre” is a common shorthand for the canonical city name “Le Havre”.
  if (term === "havre") return "location:le-havre";
  return undefined;
}

function findTypeKey(value: string): string | undefined {
  const term = normalized(value);
  const match = propertyTypeOptions.find((type) =>
    normalized(type.label) === term
      || normalized(type.value) === term
      || (type.value === "maison_villa" && term === "maison"),
  );
  return match ? `type:${match.value}` : undefined;
}

function findFeatureKey(value: string): string | undefined {
  const term = normalized(value);
  const match = featureOptions.find((feature) =>
    normalized(feature.label) === term || normalized(feature.value) === term,
  );
  return match ? `feature:${match.value}` : undefined;
}

/** Maps applied searches to approved labels only; free-text queries are never stored. */
export function getSearchPopularityKeys(filters: PropertySearchParams): string[] {
  const keys = new Set<string>();

  if (filters.city) {
    const cityLocation = listingLocationOptions.find((area) => area.city === filters.city && !area.query);
    if (cityLocation) keys.add(`location:${cityLocation.id}`);
  }

  if (filters.q) {
    const locationKey = findLocationKey(filters.q);
    const typeKey = findTypeKey(filters.q);
    const featureKey = findFeatureKey(filters.q);
    if (locationKey) keys.add(locationKey);
    else if (typeKey) keys.add(typeKey);
    else if (featureKey) keys.add(featureKey);
  }

  if (filters.type) keys.add(`type:${filters.type}`);
  filters.features?.forEach((feature) => keys.add(`feature:${feature}`));

  return [...keys].filter((key) => candidatesByKey.has(key)).slice(0, 8);
}

export function getSearchPopularityCandidate(key: string): SearchPopularityCandidate | undefined {
  return candidatesByKey.get(key);
}
