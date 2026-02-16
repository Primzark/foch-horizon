import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const payloadSchema = z.object({
  source: z.enum(["contact_page", "property_page", "estimation", "favorites_share"]),
  propertyId: z.number().int().positive().optional(),
  cityId: z.string().uuid().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(8).max(2000),
  consent: z.literal(true),
  callbackWindow: z.string().optional(),
  financingStatus: z.enum(["cash", "mortgage_in_progress", "needs_financing"]).optional(),
});

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createServiceClient();
    const rawPayload = await request.json();
    const payload = payloadSchema.parse(rawPayload);

    let assignedAgentId: string | null = null;

    if (payload.propertyId) {
      const { data: propertyData } = await supabase.from("properties").select("agent_id").eq("id", payload.propertyId).maybeSingle();
      assignedAgentId = propertyData?.agent_id ?? null;
    }

    if (!assignedAgentId && payload.cityId) {
      const { data: cityAgentData } = await supabase.from("agents").select("id").eq("is_active", true).limit(1);
      assignedAgentId = cityAgentData?.[0]?.id ?? null;
    }

    if (!assignedAgentId) {
      const { data: fallbackAgent } = await supabase.from("agents").select("id").eq("is_active", true).limit(1);
      assignedAgentId = fallbackAgent?.[0]?.id ?? null;
    }

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    const { data, error } = await supabase
      .from("leads")
      .insert({
        source: payload.source,
        property_id: payload.propertyId ?? null,
        city_id: payload.cityId ?? null,
        first_name: payload.firstName,
        last_name: payload.lastName,
        email: payload.email,
        phone: payload.phone ?? null,
        message: payload.message,
        consent: payload.consent,
        ip_hash: ipAddress,
        user_agent: userAgent,
        assigned_agent_id: assignedAgentId,
        status: assignedAgentId ? "assigned" : "new",
      })
      .select("id")
      .single();

    if (error) throw error;

    return jsonResponse({ ok: true, leadId: data.id, assignedAgentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 400);
  }
});
