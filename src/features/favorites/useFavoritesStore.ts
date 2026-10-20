import { create } from "zustand";
import { persist } from "zustand/middleware";
import { trackEvent } from "@/lib/analytics/events";
import type { PropertyType } from "@/types/domain";
import { persistPropertyLike } from "@/features/favorites/api/propertyLikes.service";

interface FavoritesState {
  ids: number[];
  propertyTypes: Record<number, PropertyType>;
  toggle: (id: number, propertyType?: PropertyType) => void;
  clear: () => void;
  isFavorite: (id: number) => boolean;
}

const propertyTypes = new Set<PropertyType>(["appartement", "maison_villa", "autre"]);

function sanitizeFavoriteIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function sanitizePropertyTypes(value: unknown): Record<number, PropertyType> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};

  const sanitized: Record<number, PropertyType> = {};
  Object.entries(value).forEach(([rawId, rawType]) => {
    const id = Number(rawId);
    if (Number.isInteger(id) && id > 0 && typeof rawType === "string" && propertyTypes.has(rawType as PropertyType)) {
      sanitized[id] = rawType as PropertyType;
    }
  });
  return sanitized;
}

function trackFavoriteChange(id: number, propertyType: PropertyType | undefined, liked: boolean): void {
  trackEvent(liked ? "property_liked" : "property_unliked", {
    property_id: id,
    ...(propertyType ? { property_type: propertyType } : {}),
    occurred_at: new Date().toISOString(),
  });
  void persistPropertyLike(id, liked).catch((error: unknown) => {
    if (import.meta.env.DEV) console.warn("[property-likes] Could not sync favorite state", error);
  });
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      propertyTypes: {},
      toggle: (id, propertyType) => {
        const state = get();
        const ids = state.ids;
        const knownPropertyType = propertyType ?? state.propertyTypes[id];
        const liked = !ids.includes(id);
        const nextTypes = { ...state.propertyTypes };
        if (liked && propertyType) nextTypes[id] = propertyType;
        if (!liked) delete nextTypes[id];
        set({ ids: liked ? [...ids, id] : ids.filter((item) => item !== id), propertyTypes: nextTypes });
        trackFavoriteChange(id, knownPropertyType, liked);
      },
      clear: () => {
        const { ids, propertyTypes } = get();
        set({ ids: [], propertyTypes: {} });
        ids.forEach((id) => trackFavoriteChange(id, propertyTypes[id], false));
      },
      isFavorite: (id) => get().ids.includes(id),
    }),
    {
      name: "foch_favorites",
      partialize: (state) => ({ ids: state.ids, propertyTypes: state.propertyTypes }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ids: sanitizeFavoriteIds((persistedState as { ids?: unknown } | undefined)?.ids),
        propertyTypes: sanitizePropertyTypes((persistedState as { propertyTypes?: unknown } | undefined)?.propertyTypes),
      }),
    },
  ),
);
