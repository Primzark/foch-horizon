import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

type MarketCountersSnapshot = {
  soldCount: number;
  underOfferCount: number;
  underContractCount: number;
  updatedAt: string;
  source: "automatic" | "manual";
};

type MarketCountersUpdatePayload = {
  soldCount: number;
  underOfferCount: number;
  underContractCount: number;
};

const COUNTERS_ROW_ID = 1;
const OPTIONS_HEADERS = {
  ...corsHeaders,
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function extractErrorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error && typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }

  return null;
}

async function countByStatuses(supabase: SupabaseServiceClient, statuses: string[]): Promise<number> {
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

async function readManualCountersSnapshot(supabase: SupabaseServiceClient): Promise<MarketCountersSnapshot | null> {
  const { data, error } = await supabase
    .from("market_counters")
    .select("sold_count,under_offer_count,under_contract_count,updated_at")
    .eq("id", COUNTERS_ROW_ID)
    .maybeSingle();

  if (error) {
    const code = extractErrorCode(error);
    if (code === "PGRST116" || code === "42P01") {
      return null;
    }

    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    soldCount: Number(data.sold_count ?? 0),
    underOfferCount: Number(data.under_offer_count ?? 0),
    underContractCount: Number(data.under_contract_count ?? 0),
    updatedAt: String(data.updated_at ?? new Date().toISOString()),
    source: "manual",
  };
}

async function readAutomaticCountersSnapshot(supabase: SupabaseServiceClient): Promise<MarketCountersSnapshot> {
  const [soldCount, underOfferCount] = await Promise.all([
    countByStatuses(supabase, ["sold", "rented"]),
    countByStatuses(supabase, ["under_offer"]),
  ]);

  return {
    soldCount,
    underOfferCount,
    // The current schema has no dedicated "under_contract" status.
    underContractCount: underOfferCount,
    updatedAt: new Date().toISOString(),
    source: "automatic",
  };
}

async function readCountersSnapshot(supabase: SupabaseServiceClient): Promise<MarketCountersSnapshot> {
  const manualSnapshot = await readManualCountersSnapshot(supabase);
  if (manualSnapshot) {
    return manualSnapshot;
  }

  return await readAutomaticCountersSnapshot(supabase);
}

function parseCountField(payload: Record<string, unknown>, key: keyof MarketCountersUpdatePayload): number {
  const rawValue = payload[key];
  if (typeof rawValue !== "number" || !Number.isInteger(rawValue) || rawValue < 0) {
    throw new HttpError(400, `Invalid payload field: ${key}`);
  }

  return rawValue;
}

function parseUpdatePayload(payload: unknown): MarketCountersUpdatePayload {
  if (!payload || typeof payload !== "object") {
    throw new HttpError(400, "Invalid payload");
  }

  const record = payload as Record<string, unknown>;

  return {
    soldCount: parseCountField(record, "soldCount"),
    underOfferCount: parseCountField(record, "underOfferCount"),
    underContractCount: parseCountField(record, "underContractCount"),
  };
}

function extractBearerToken(request: Request): string {
  const authHeader = request.headers.get("authorization")?.trim() ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "Missing bearer token");
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new HttpError(401, "Missing bearer token");
  }

  return token;
}

function getAllowedAdminEmails(): Set<string> {
  const raw = Deno.env.get("MARKET_COUNTERS_ADMIN_EMAILS") ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
}

async function requireAdminUserId(request: Request, supabase: SupabaseServiceClient): Promise<string> {
  const token = extractBearerToken(request);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new HttpError(401, "Invalid or expired session");
  }

  const allowedEmails = getAllowedAdminEmails();
  if (allowedEmails.size === 0) {
    throw new HttpError(503, "Admin email allowlist is not configured");
  }

  const userEmail = data.user.email?.trim().toLowerCase();
  if (!userEmail || !allowedEmails.has(userEmail)) {
    throw new HttpError(403, "You do not have access to this dashboard");
  }

  return data.user.id;
}

async function updateManualCountersSnapshot(
  supabase: SupabaseServiceClient,
  payload: MarketCountersUpdatePayload,
  updatedByUserId: string,
): Promise<MarketCountersSnapshot> {
  const updatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("market_counters")
    .upsert(
      {
        id: COUNTERS_ROW_ID,
        sold_count: payload.soldCount,
        under_offer_count: payload.underOfferCount,
        under_contract_count: payload.underContractCount,
        updated_at: updatedAt,
        updated_by: updatedByUserId,
      },
      { onConflict: "id" },
    )
    .select("sold_count,under_offer_count,under_contract_count,updated_at")
    .single();

  if (error) {
    const code = extractErrorCode(error);
    if (code === "42P01") {
      throw new HttpError(500, "market_counters table is missing. Apply latest migrations first.");
    }

    throw error;
  }

  return {
    soldCount: Number(data.sold_count ?? 0),
    underOfferCount: Number(data.under_offer_count ?? 0),
    underContractCount: Number(data.under_contract_count ?? 0),
    updatedAt: String(data.updated_at ?? updatedAt),
    source: "manual",
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: OPTIONS_HEADERS });
  }

  try {
    const supabase = createServiceClient();

    if (request.method === "GET") {
      const snapshot = await readCountersSnapshot(supabase);
      return jsonResponse(snapshot);
    }

    if (request.method === "PUT") {
      const userId = await requireAdminUserId(request, supabase);
      let rawPayload: unknown;
      try {
        rawPayload = await request.json();
      } catch {
        throw new HttpError(400, "Invalid JSON payload");
      }
      const payload = parseUpdatePayload(rawPayload);
      const snapshot = await updateManualCountersSnapshot(supabase, payload, userId);
      return jsonResponse(snapshot);
    }

    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ ok: false, error: error.message }, error.status);
    }

    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
