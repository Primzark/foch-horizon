import { createClient } from "npm:@supabase/supabase-js@2.97.0";

const ADMIN_STATUSES = new Set(["active", "under_offer", "reserved", "sold", "rented", "off_market"]);
const PAGE_SIZE = 500;
const functionHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service configuration is missing.");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...functionHeaders, "Content-Type": "application/json" },
  });
}

function extractBearerToken(request: Request): string {
  const authHeader = request.headers.get("authorization")?.trim() ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "Missing bearer token");
  }

  const token = authHeader.slice(7).trim();
  if (!token) throw new HttpError(401, "Missing bearer token");
  return token;
}

async function requireAdmin(request: Request, supabase: ReturnType<typeof createServiceClient>): Promise<void> {
  const token = extractBearerToken(request);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Your session is invalid or has expired.");

  const allowedEmails = new Set(
    (Deno.env.get("MARKET_COUNTERS_ADMIN_EMAILS") ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  if (allowedEmails.size === 0) {
    throw new HttpError(503, "The administrator allowlist is not configured.");
  }

  const userEmail = data.user.email?.trim().toLowerCase();
  if (!userEmail || !allowedEmails.has(userEmail)) {
    throw new HttpError(403, "You do not have access to property management.");
  }
}

async function listProperties(supabase: ReturnType<typeof createServiceClient>) {
  const properties = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("properties")
      .select(
        "id,title,slug,transaction_type,property_type,status,admin_status_override,price_amount,price_currency,surface_m2,bedrooms,postal_code,updated_at,city:cities(name,slug),images:property_images(source_url,sort_order)",
      )
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    properties.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return properties;
}

async function listPropertyLikeSummary(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase.rpc("admin_property_like_summary");
  if (error) throw error;
  return data ?? [];
}

async function listPropertyLikeHistory(
  supabase: ReturnType<typeof createServiceClient>,
  propertyId: number,
) {
  const events = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("property_like_events")
      .select("id,property_id,property_type,visitor_id,action,occurred_at")
      .eq("property_id", propertyId)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    events.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return events;
}

async function updatePropertyStatus(
  request: Request,
  supabase: ReturnType<typeof createServiceClient>,
) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON payload.");
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new HttpError(400, "Invalid property update.");
  }

  const body = payload as Record<string, unknown>;
  const id = typeof body.id === "number" ? body.id : Number(body.id);
  const status = typeof body.status === "string" ? body.status : "";
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, "Invalid property reference.");
  if (!ADMIN_STATUSES.has(status)) throw new HttpError(400, "Choose a valid property status.");

  const { data, error } = await supabase
    .from("properties")
    .update({
      status,
      admin_status_override: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,status,admin_status_override,updated_at")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new HttpError(404, "Property not found.");
  return data;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: functionHeaders });
  }

  try {
    if (request.method !== "GET" && request.method !== "PATCH") {
      return jsonResponse({ error: "Method not allowed." }, 405);
    }

    const supabase = createServiceClient();
    await requireAdmin(request, supabase);

    if (request.method === "GET") {
      const url = new URL(request.url);
      const query = url.searchParams;

      if (query.get("check") === "admin-access") {
        return jsonResponse({ authorized: true });
      }

      if (query.get("view") === "likes-summary") {
        const likes = await listPropertyLikeSummary(supabase);
        return jsonResponse({ likes });
      }

      if (query.get("view") === "likes-history") {
        const propertyId = Number(query.get("propertyId"));
        if (!Number.isSafeInteger(propertyId) || propertyId <= 0) {
          throw new HttpError(400, "Invalid property reference.");
        }
        const events = await listPropertyLikeHistory(supabase, propertyId);
        return jsonResponse({ events });
      }

      const properties = await listProperties(supabase);
      return jsonResponse({ properties });
    }

    const property = await updatePropertyStatus(request, supabase);
    return jsonResponse({ property });
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
    console.error("[admin-properties] Request failed", error);
    return jsonResponse({ error: "Could not load or update properties." }, 500);
  }
});
