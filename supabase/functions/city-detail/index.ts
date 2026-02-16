import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const url = new URL(request.url);
    const slug = url.pathname.split("/").pop();

    if (!slug) {
      return jsonResponse({ ok: false, error: "Missing city slug" }, 400);
    }

    const { data, error } = await supabase.from("cities").select("*").eq("slug", slug).maybeSingle();
    if (error) throw error;
    if (!data) return jsonResponse({ ok: false, error: "Not found" }, 404);

    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
