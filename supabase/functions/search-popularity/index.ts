import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import {
  consumeRequestLimit,
  isAllowedSiteOrigin,
  secureJsonResponse,
  secureOptionsResponse,
} from "../_shared/request-security.ts";

const allowedSearchKeys = new Set([
  "location:le-havre",
  "location:sainte-adresse",
  "location:la-plage",
  "location:gobelins",
  "location:saint-michel",
  "location:octeville-sur-mer",
  "location:montivilliers",
  "location:maneglise",
  "location:gainneville",
  "location:saint-romain",
  "location:etretat",
  "location:deauville",
  "location:trouville",
  "location:halles-centrales",
  "location:hotel-de-ville",
  "location:notre-dame",
  "location:saint-francois",
  "location:perrey",
  "location:danton",
  "location:bleville",
  "location:centre-ville",
  "location:avenue-foch",
  "location:harfleur",
  "location:gonfreville-l-orcher",
  "location:rogerville",
  "location:saint-laurent-de-brevedent",
  "location:etainhus",
  "location:epretot",
  "location:saint-aubin-routot",
  "location:la-remuee",
  "location:gommerville",
  "location:la-cerlangue",
  "location:les-trois-pierres",
  "location:cauville-sur-mer",
  "location:les-docks",
  "location:honfleur",
  "type:appartement",
  "type:maison_villa",
  "type:autre",
  "feature:ascenseur",
  "feature:balcon",
  "feature:vue_mer",
  "feature:garage",
  "feature:jardin",
]);

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list") }).strict(),
  z.object({ action: z.literal("record"), keys: z.array(z.string().max(64)).min(1).max(8) }).strict(),
]);

const minimumSearchCount = 5;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return secureOptionsResponse(request);
  if (!isAllowedSiteOrigin(request.headers.get("origin"))) {
    return secureJsonResponse(request, { error: "Origin not allowed" }, 403);
  }
  if (request.method !== "POST") {
    return secureJsonResponse(request, { error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(rawBody);
    if (!parsed.success) return secureJsonResponse(request, { error: "Invalid request" }, 400);

    const supabase = createServiceClient();
    const withinRequestLimit = await consumeRequestLimit(supabase, request, "search-popularity-request", 120, 900);
    if (!withinRequestLimit) return secureJsonResponse(request, { error: "Too many requests" }, 429);

    if (parsed.data.action === "list") {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 29);
      const { data, error } = await supabase
        .from("search_popularity_daily")
        .select("search_key, search_count")
        .gte("search_day", since.toISOString().slice(0, 10));
      if (error) throw error;

      const counts = new Map<string, number>();
      for (const row of data ?? []) {
        if (allowedSearchKeys.has(row.search_key)) {
          counts.set(row.search_key, (counts.get(row.search_key) ?? 0) + row.search_count);
        }
      }

      const suggestions = [...counts.entries()]
        .filter(([, count]) => count >= minimumSearchCount)
        .sort(([keyA, countA], [keyB, countB]) => countB - countA || keyA.localeCompare(keyB))
        .slice(0, 4)
        .map(([key]) => ({ key }));

      return secureJsonResponse(request, { suggestions });
    }

    const keys = [...new Set(parsed.data.keys)];
    if (keys.some((key) => !allowedSearchKeys.has(key))) {
      return secureJsonResponse(request, { error: "Invalid search key" }, 400);
    }

    for (const key of keys) {
      const withinKeyLimit = await consumeRequestLimit(
        supabase,
        request,
        `search-pop-${key}`,
        1,
        86_400,
      );
      if (!withinKeyLimit) continue;

      const { error } = await supabase.rpc("record_search_popularity", { p_search_key: key });
      if (error) throw error;
    }

    return secureJsonResponse(request, { ok: true });
  } catch (error) {
    console.error("[search-popularity] Request failed", error);
    return secureJsonResponse(request, { error: "Could not process search popularity." }, 500);
  }
});
