import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  ids: number[];
  toggle: (id: number) => void;
  clear: () => void;
  isFavorite: (id: number) => boolean;
}

function sanitizeFavoriteIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const ids = get().ids;
        set({ ids: ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] });
      },
      clear: () => set({ ids: [] }),
      isFavorite: (id) => get().ids.includes(id),
    }),
    {
      name: "foch_favorites",
      partialize: (state) => ({ ids: state.ids }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ids: sanitizeFavoriteIds((persistedState as { ids?: unknown } | undefined)?.ids),
      }),
    },
  ),
);
