import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const payloadSchema = z.object({
  source: z.enum(["contact_page", "property_page", "estimation", "favorites_share"]),
  propertyId: z.number().int().positive().optional(),
  cityId: z.string().trim().min(1).max(120).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(8).max(2000),
  consent: z.literal(true),
  callbackWindow: z.string().optional(),
  financingStatus: z.enum(["cash", "mortgage_in_progress", "needs_financing"]).optional(),
  chatbotContext: z
    .object({
      sessionId: z.string().min(1).max(120).optional(),
      conversationId: z.string().min(1).max(120).optional(),
      preferences: z.record(z.string(), z.unknown()).optional(),
      qualification: z.record(z.string(), z.unknown()).optional(),
      selectedProperties: z.array(z.number().int().positive()).max(10).optional(),
      planner: z.record(z.string(), z.unknown()).optional(),
      toolSummary: z
        .object({
          actionKinds: z.array(z.string().min(1).max(60)).max(12).optional(),
          requestId: z.string().min(1).max(120).optional(),
          routeCategory: z.string().min(1).max(80).optional(),
          edgeProvider: z.string().min(1).max(80).optional(),
        })
        .partial()
        .optional(),
      multimodalHighlights: z
        .array(
          z.object({
            kind: z.string().min(1).max(80),
            propertyId: z.number().int().positive().optional(),
            title: z.string().min(1).max(200).optional(),
            confidence: z.number().min(0).max(1).optional(),
          }),
        )
        .max(8)
        .optional(),
      sourceMetadata: z.record(z.string(), z.unknown()).optional(),
    })
    .strict()
    .optional(),
});

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendWebhookNotification(payload: z.infer<typeof payloadSchema>, assignedAgentId: string | null): Promise<void> {
  const webhookUrl = Deno.env.get("LEADS_NOTIFICATION_WEBHOOK_URL") ?? "";
  if (!webhookUrl) {
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "lead_created",
      assignedAgentId,
      createdAt: new Date().toISOString(),
      lead: payload,
      chatbotContext: payload.chatbotContext ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lead webhook failed (${response.status})`);
  }
}

async function sendResendNotification(payload: z.infer<typeof payloadSchema>, assignedAgentId: string | null): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!resendApiKey) {
    return;
  }

  const to = Deno.env.get("LEADS_NOTIFICATION_EMAIL") ?? "vendre@fochimmobilier.com";
  const from = Deno.env.get("LEADS_FROM_EMAIL") ?? "Foch Immobilier <leads@foch-immobilier.fr>";
  const subject = `[Lead ${payload.source}] ${payload.firstName} ${payload.lastName}`;

  const safeMessage = escapeHtml(payload.message);
  const chatbotContextSummary = payload.chatbotContext
    ? `
    <h3>Contexte chatbot (structuré)</h3>
    <pre>${escapeHtml(JSON.stringify(payload.chatbotContext, null, 2))}</pre>
  `
    : "";
  const html = `
    <h2>Nouveau lead Foch Immobilier</h2>
    <p><strong>Source:</strong> ${escapeHtml(payload.source)}</p>
    <p><strong>Nom:</strong> ${escapeHtml(payload.firstName)} ${escapeHtml(payload.lastName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
    <p><strong>Téléphone:</strong> ${escapeHtml(payload.phone ?? "non renseigné")}</p>
    <p><strong>Ville:</strong> ${escapeHtml(payload.cityId ?? "non renseignée")}</p>
    <p><strong>Bien:</strong> ${escapeHtml(payload.propertyId ? String(payload.propertyId) : "non renseigné")}</p>
    <p><strong>Agent assigné:</strong> ${escapeHtml(assignedAgentId ?? "non assigné")}</p>
    <p><strong>Message:</strong></p>
    <pre>${safeMessage}</pre>
    ${chatbotContextSummary}
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      reply_to: payload.email,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend email failed (${response.status})`);
  }
}

async function notifyLead(payload: z.infer<typeof payloadSchema>, assignedAgentId: string | null): Promise<void> {
  await Promise.allSettled([
    sendWebhookNotification(payload, assignedAgentId),
    sendResendNotification(payload, assignedAgentId),
  ]);
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
    let normalizedCityId: string | null = null;

    if (payload.cityId) {
      const cityIdCandidate = payload.cityId.trim();

      if (uuidPattern.test(cityIdCandidate)) {
        normalizedCityId = cityIdCandidate;
      } else {
        const citySlug = cityIdCandidate.toLowerCase();
        const { data: cityBySlug, error: cityLookupError } = await supabase
          .from("cities")
          .select("id")
          .eq("slug", citySlug)
          .maybeSingle();

        if (cityLookupError) throw cityLookupError;
        if (!cityBySlug) {
          return jsonResponse({ ok: false, error: `Unknown city slug: ${citySlug}` }, 400);
        }

        normalizedCityId = cityBySlug.id;
      }
    }

    let assignedAgentId: string | null = null;

    if (payload.propertyId) {
      const { data: propertyData } = await supabase.from("properties").select("agent_id").eq("id", payload.propertyId).maybeSingle();
      assignedAgentId = propertyData?.agent_id ?? null;
    }

    if (!assignedAgentId && normalizedCityId) {
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
        city_id: normalizedCityId,
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

    await notifyLead(payload, assignedAgentId);

    return jsonResponse({ ok: true, leadId: data.id, assignedAgentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return jsonResponse({ ok: false, error: message }, 400);
  }
});
