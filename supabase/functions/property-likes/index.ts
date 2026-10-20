import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import {
  consumeRequestLimit,
  isAllowedSiteOrigin,
  secureJsonResponse,
  secureOptionsResponse,
} from "../_shared/request-security.ts";

const payloadSchema = z.object({
  propertyId: z.number().int().positive(),
  visitorId: z.string().uuid(),
  liked: z.boolean(),
}).strict();

function isJsonRequest(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").toLowerCase().includes("application/json");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return secureOptionsResponse(request);
  }

  if (request.method !== "POST") {
    return secureJsonResponse(request, { ok: false, error: "Method not allowed" }, 405);
  }

  if (!isAllowedSiteOrigin(request.headers.get("origin"))) {
    return secureJsonResponse(request, { ok: false, error: "Request unavailable" }, 403);
  }

  if (!isJsonRequest(request)) {
    return secureJsonResponse(request, { ok: false, error: "Invalid request" }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 4_096) {
    return secureJsonResponse(request, { ok: false, error: "Invalid request" }, 413);
  }

  let payload: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 4_096) {
      return secureJsonResponse(request, { ok: false, error: "Invalid request" }, 413);
    }
    payload = JSON.parse(body);
  } catch {
    return secureJsonResponse(request, { ok: false, error: "Invalid request" }, 400);
  }

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return secureJsonResponse(request, { ok: false, error: "Invalid like request" }, 400);
  }

  try {
    const supabase = createServiceClient();
    const withinShortLimit = await consumeRequestLimit(supabase, request, "property-likes-short", 80, 900);
    const withinDailyLimit = withinShortLimit && await consumeRequestLimit(supabase, request, "property-likes-daily", 400, 86_400);
    if (!withinShortLimit || !withinDailyLimit) {
      return secureJsonResponse(request, { ok: false, error: "Too many requests. Please try again later." }, 429);
    }

    const { data, error } = await supabase.rpc("set_property_like", {
      p_property_id: parsed.data.propertyId,
      p_visitor_id: parsed.data.visitorId,
      p_is_liked: parsed.data.liked,
    });

    if (error) {
      if (error.code === "P0002") {
        return secureJsonResponse(request, { ok: false, error: "Property not found" }, 404);
      }
      throw error;
    }

    const result = Array.isArray(data) ? data[0] : data;
    return secureJsonResponse(request, { ok: true, ...result });
  } catch (error) {
    console.error("[property-likes] Request failed", error);
    return secureJsonResponse(request, { ok: false, error: "Could not save this like." }, 500);
  }
});
