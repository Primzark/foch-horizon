import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

async function countByStatuses(statuses: string[]): Promise<number> {
  const supabase = createServiceClient();

  let query = supabase.from("properties").select("id", { count: "exact", head: true });

  if (statuses.length === 1) {
    query = query.eq("status", statuses[0]);
  } else {
    query = query.in("status", statuses);
  }

  const { count, error } = await query;
  if (error) throw error;

  return count ?? 0;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const [soldCount, underOfferCount] = await Promise.all([
      countByStatuses(["sold", "rented"]),
      countByStatuses(["under_offer"]),
    ]);

    // The current schema has no dedicated "under_contract" status.
    return jsonResponse({
      soldCount,
      underOfferCount,
      underContractCount: underOfferCount,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
