import { create } from "zustand";
import { persist } from "zustand/middleware";

export const PROPERTY_COMPARE_LIMIT = 3;

interface PropertyCompareState {
  ids: number[];
  toggle: (id: number) => boolean;
  remove: (id: number) => void;
  clear: () => void;
}

function sanitizePropertyIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.map((item) => (typeof item === "number" ? item : Number(item))))]
    .filter((item) => Number.isInteger(item) && item > 0)
    .slice(0, PROPERTY_COMPARE_LIMIT);
}

export const usePropertyCompareStore = create<PropertyCompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        if (!Number.isInteger(id) || id <= 0) return false;

        const ids = get().ids;
        if (ids.includes(id)) {
          set({ ids: ids.filter((item) => item !== id) });
          return true;
        }

        if (ids.length >= PROPERTY_COMPARE_LIMIT) return false;
        set({ ids: [...ids, id] });
        return true;
      },
      remove: (id) => set((state) => ({ ids: state.ids.filter((item) => item !== id) })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: "foch_property_compare",
      partialize: (state) => ({ ids: state.ids }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ids: sanitizePropertyIds((persistedState as { ids?: unknown } | undefined)?.ids),
      }),
    },
  ),
);
