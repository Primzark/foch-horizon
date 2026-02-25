import { cities, cityBySlug } from "@/features/cities/data/cities";
import { apiJson, isEdgeApiEnabled } from "@/lib/api/client";
import type { City } from "@/types/domain";

const apiDelay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
const defaultHeroImageUrl = cities[0]?.heroImageUrl ?? "";

type EdgeCityRow = {
  id?: string | null;
  name?: string | null;
  slug?: string | null;
  postal_codes?: string[] | null;
  is_active?: boolean | null;
  hero_image_url?: string | null;
};

function mapEdgeCityRowToDomain(row: EdgeCityRow): City {
  const slug = typeof row.slug === "string" ? row.slug.trim() : "";
  const localFallback = slug ? cityBySlug.get(slug) : undefined;

  return {
    id: typeof row.id === "string" && row.id.trim().length > 0 ? row.id : (localFallback?.id ?? `city-${slug || "unknown"}`),
    name:
      typeof row.name === "string" && row.name.trim().length > 0
        ? row.name.trim()
        : (localFallback?.name ?? "Ville"),
    slug: slug || localFallback?.slug || "",
    postalCodes:
      Array.isArray(row.postal_codes) && row.postal_codes.every((value) => typeof value === "string")
        ? row.postal_codes.map((value) => value.trim()).filter((value) => value.length > 0)
        : (localFallback?.postalCodes ?? []),
    isActive: typeof row.is_active === "boolean" ? row.is_active : (localFallback?.isActive ?? true),
    heroImageUrl:
      typeof row.hero_image_url === "string" && row.hero_image_url.trim().length > 0
        ? row.hero_image_url.trim()
        : (localFallback?.heroImageUrl ?? defaultHeroImageUrl),
  };
}

export async function getCities(): Promise<City[]> {
  if (isEdgeApiEnabled()) {
    const rows = await apiJson<EdgeCityRow[]>("/api/cities");
    return rows.map(mapEdgeCityRowToDomain).filter((city) => city.isActive);
  }

  await apiDelay();
  return cities.filter((city) => city.isActive);
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  if (isEdgeApiEnabled()) {
    try {
      const row = await apiJson<EdgeCityRow>(`/api/cities/${slug}`);
      return mapEdgeCityRowToDomain(row);
    } catch {
      return null;
    }
  }

  await apiDelay();
  return cityBySlug.get(slug) ?? null;
}
