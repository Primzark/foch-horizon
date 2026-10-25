import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { useUiStore } from "@/lib/state/useUiStore";
import type { PropertySearchParams } from "@/types/api";
import { getSearchPopularityKeys } from "@/features/listings/utils/searchPopularity";

export interface PopularSearchSuggestion {
  key: string;
}

export async function fetchPopularSearchSuggestions(): Promise<PopularSearchSuggestion[]> {
  const client = getBrowserSupabaseClient();
  if (!client) return [];

  const { data, error } = await client.functions.invoke<{ suggestions?: PopularSearchSuggestion[] }>("search-popularity", {
    body: { action: "list" },
  });
  if (error) throw error;

  return Array.isArray(data?.suggestions)
    ? data.suggestions.filter((suggestion) => typeof suggestion?.key === "string")
    : [];
}

/** Records only allowlisted search facets, and only after analytics consent. */
export function recordSearchPopularity(filters: PropertySearchParams): void {
  if (useUiStore.getState().cookieConsent !== "accepted") return;

  const keys = getSearchPopularityKeys(filters);
  const client = getBrowserSupabaseClient();
  if (keys.length === 0 || !client) return;

  void client.functions.invoke("search-popularity", {
    body: { action: "record", keys },
  }).then(({ error }) => {
    if (error && import.meta.env.DEV) {
      console.warn("[search-popularity] Could not record applied search", error.message);
    }
  }).catch((error: unknown) => {
    if (import.meta.env.DEV) console.warn("[search-popularity] Could not record applied search", error);
  });
}
