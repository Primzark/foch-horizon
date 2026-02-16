import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const url = new URL(request.url);
    const citySlug = url.pathname.split("/").pop();

    if (!citySlug) {
      return jsonResponse({ ok: false, error: "Missing city slug" }, 400);
    }

    const { data: city, error: cityError } = await supabase
      .from("cities")
      .select("id,name,slug")
      .eq("slug", citySlug)
      .maybeSingle();

    if (cityError) throw cityError;
    if (!city) return jsonResponse({ ok: false, error: "City not found" }, 404);

    const { data: properties, error: propertiesError } = await supabase
      .from("properties")
      .select(
        "id,title,slug,transaction_type,property_type,status,price_amount,price_currency,surface_m2,bedrooms,bathrooms,parking_count,garage_count,postal_code,dpe_label,images:property_images(source_url,sort_order)",
      )
      .eq("city_id", city.id)
      .neq("status", "off_market")
      .order("published_at", { ascending: false });

    if (propertiesError) throw propertiesError;

    return jsonResponse({ city, items: properties ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
