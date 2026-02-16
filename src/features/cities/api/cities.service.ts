import { cities, cityBySlug } from "@/features/cities/data/cities";
import { apiJson, isEdgeApiEnabled } from "@/lib/api/client";
import type { City } from "@/types/domain";

const apiDelay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getCities(): Promise<City[]> {
  if (isEdgeApiEnabled()) {
    return apiJson<City[]>("/api/cities");
  }

  await apiDelay();
  return cities.filter((city) => city.isActive);
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  if (isEdgeApiEnabled()) {
    try {
      return await apiJson<City>(`/api/cities/${slug}`);
    } catch {
      return null;
    }
  }

  await apiDelay();
  return cityBySlug.get(slug) ?? null;
}
