import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface PropertyImageRow {
  source_url: string;
  sort_order: number | null;
}

interface PropertyRow {
  id: number;
  title: string;
  slug: string;
  transaction_type: string;
  property_type: string;
  status: string;
  price_amount: number;
  price_currency: string;
  surface_m2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_count: number | null;
  garage_count: number | null;
  postal_code: string | null;
  dpe_label: string | null;
  city?: {
    name?: string | null;
    slug?: string | null;
  } | null;
  images?: PropertyImageRow[] | null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createServiceClient();
    const url = new URL(request.url);
    const params = url.searchParams;

    const page = Number(params.get("page") ?? "1");
    const pageSize = Number(params.get("pageSize") ?? "24");
    const from = Math.max(0, (page - 1) * pageSize);
    const to = from + pageSize - 1;

    let query = supabase
      .from("properties")
      .select(
        "id,title,slug,transaction_type,property_type,status,price_amount,price_currency,surface_m2,bedrooms,bathrooms,parking_count,garage_count,postal_code,dpe_label,city:cities(name,slug),images:property_images(source_url,sort_order)",
        { count: "exact" },
      )
      .neq("status", "off_market")
      .order("published_at", { ascending: false })
      .range(from, to);

    const transaction = params.get("transaction");
    if (transaction) query = query.eq("transaction_type", transaction);

    const type = params.get("type");
    if (type) query = query.eq("property_type", type);

    const city = params.get("city");
    if (city) query = query.eq("city.slug", city);

    const minPrice = params.get("priceMin");
    if (minPrice) query = query.gte("price_amount", Number(minPrice));

    const maxPrice = params.get("priceMax");
    if (maxPrice) query = query.lte("price_amount", Number(maxPrice));

    const { data, error, count } = await query;
    if (error) throw error;

    const items = (data as PropertyRow[] | null ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      transaction: item.transaction_type,
      type: item.property_type,
      priceAmount: item.price_amount,
      currency: item.price_currency,
      surfaceM2: item.surface_m2,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      parking: item.parking_count,
      garage: item.garage_count,
      city: {
        name: item.city?.name ?? "",
        slug: item.city?.slug ?? "",
        postalCode: item.postal_code ?? "",
      },
      coverImageUrl:
        item.images?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.source_url ?? "",
      dpeLabel: item.dpe_label,
      status: item.status,
    }));

    return jsonResponse({
      page,
      pageSize,
      total: count ?? items.length,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
