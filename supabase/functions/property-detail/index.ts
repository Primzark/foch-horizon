import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const url = new URL(request.url);
    const id = Number(url.pathname.split("/").pop());

    if (!Number.isInteger(id)) {
      return jsonResponse({ ok: false, error: "Invalid property id" }, 400);
    }

    const { data, error } = await supabase
      .from("properties")
      .select(
        "*, city:cities(*), agent:agents(*), images:property_images(*), features:property_features(*)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return jsonResponse({ ok: false, error: "Not found" }, 404);

    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
