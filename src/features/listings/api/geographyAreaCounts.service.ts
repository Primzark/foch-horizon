import { geographyGuideOptions } from "@/features/content/data/geographyGuideOptions";
import { isEdgeApiEnabled } from "@/lib/api/client";
import { normalizeKeyword } from "@/features/listings/utils/formatting";
import { searchProperties } from "@/features/listings/api/properties.service";
import type { PropertySearchItem, PropertySearchParams } from "@/types/api";

type AreaOption = (typeof geographyGuideOptions)[number];

export interface GeographyAreaPropertyCounts {
  all: number;
  byArea: Record<string, number>;
}

function isAreaQuery(currentQuery: string | undefined): boolean {
  return geographyGuideOptions.some((option) => option.query === currentQuery);
}

function getAreaQuery(area: Pick<AreaOption, "query">, currentQuery: string | undefined): string | undefined {
  const isCurrentQueryAnArea = isAreaQuery(currentQuery);
  return area.query ?? (isCurrentQueryAnArea ? undefined : currentQuery);
}

function matchesTextQuery(item: PropertySearchItem, rawQuery: string): boolean {
  const query = normalizeKeyword(rawQuery);
  const matchesText = [
    item.title,
    item.slug,
    item.city.name,
    item.city.slug,
    item.city.postalCode,
  ].some((value) => normalizeKeyword(value).includes(query));

  if (matchesText) return true;

  const numericQuery = rawQuery.replace(/[^\d]/g, "");
  return numericQuery.length >= 3 && Number.isInteger(Number(numericQuery)) && item.id === Number(numericQuery);
}

function matchesArea(item: PropertySearchItem, area: AreaOption, query: string | undefined): boolean {
  if (area.city) {
    const cityNeedle = normalizeKeyword(area.city);
    const matchesCity =
      normalizeKeyword(item.city.slug) === cityNeedle ||
      normalizeKeyword(item.city.name).includes(cityNeedle) ||
      normalizeKeyword(item.city.postalCode).includes(cityNeedle);
    if (!matchesCity) return false;
  }

  return !query || matchesTextQuery(item, query);
}

function getCountSearchFilters(filters: PropertySearchParams): PropertySearchParams {
  return {
    transaction: "vente",
    type: filters.type,
    bedroomsMin: filters.bedroomsMin,
    bathroomsMin: filters.bathroomsMin,
    garagesMin: filters.garagesMin,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    surfaceMin: filters.surfaceMin,
    surfaceMax: filters.surfaceMax,
    terrainMin: filters.terrainMin,
    terrainMax: filters.terrainMax,
    features: filters.features,
  };
}

export async function getGeographyAreaPropertyCounts(
  filters: PropertySearchParams,
): Promise<GeographyAreaPropertyCounts> {
  const countFilters = getCountSearchFilters(filters);
  const byArea: Record<string, number> = {};

  if (!isEdgeApiEnabled()) {
    const [allResults, ...areaResults] = await Promise.all([
      searchProperties({ ...countFilters, q: isAreaQuery(filters.q) ? undefined : filters.q, page: 1, pageSize: 1 }),
      ...geographyGuideOptions.map((area) =>
        searchProperties({
          ...countFilters,
          city: area.city,
          q: getAreaQuery(area, filters.q),
          page: 1,
          pageSize: 1,
        }),
      ),
    ]);

    geographyGuideOptions.forEach((area, index) => {
      byArea[area.id] = areaResults[index].total;
    });

    return { all: allResults.total, byArea };
  }

  const allItems: PropertySearchItem[] = [];
  const pageSize = 100;
  let page = 1;
  let total = 0;
  let hasMore = true;

  do {
    const result = await searchProperties({ ...countFilters, page, pageSize });
    total = result.total;
    allItems.push(...result.items);
    page += 1;
    hasMore = result.items.length > 0 && allItems.length < total;
  } while (hasMore);

  const allQuery = isAreaQuery(filters.q) ? undefined : filters.q;
  const all = allQuery ? allItems.filter((item) => matchesTextQuery(item, allQuery)).length : total;

  geographyGuideOptions.forEach((area) => {
    const query = getAreaQuery(area, filters.q);
    byArea[area.id] = allItems.filter((item) => matchesArea(item, area, query)).length;
  });

  return { all, byArea };
}
