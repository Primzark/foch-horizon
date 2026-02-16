import { cities, cityBySlug } from "@/features/cities/data/cities";
import type { City } from "@/types/domain";

const apiDelay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getCities(): Promise<City[]> {
  if (API_BASE) {
    return fetchJson<City[]>("/api/cities");
  }

  await apiDelay();
  return cities.filter((city) => city.isActive);
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  if (API_BASE) {
    try {
      return await fetchJson<City>(`/api/cities/${slug}`);
    } catch {
      return null;
    }
  }

  await apiDelay();
  return cityBySlug.get(slug) ?? null;
}
