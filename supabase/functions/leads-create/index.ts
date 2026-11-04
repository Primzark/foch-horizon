import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import { consumeRequestLimit, getRequestIpHash, isAllowedSiteOrigin, secureJsonResponse, secureOptionsResponse } from "../_shared/request-security.ts";

const payloadSchema = z.object({
  source: z.enum(["contact_page", "property_page", "estimation", "favorites_share"]),
  propertyId: z.number().int().positive().optional(),
  cityId: z.string().trim().min(1).max(120).optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(40).optional(),
  message: z.string().trim().min(8).max(2000),
  consent: z.literal(true),
  website: z.string().trim().max(500).optional(),
  formStartedAt: z.number().int().positive(),
  preferredDates: z.array(z.string().trim().min(1).max(80)).max(3).optional(),
  callbackWindow: z.string().trim().max(120).optional(),
  financingStatus: z.enum(["not_defined", "cash", "mortgage_in_progress", "needs_financing"]).optional(),
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
}).strict();

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRequestTitle(source: z.infer<typeof payloadSchema>["source"]): string {
  switch (source) {
    case "property_page": return "Question sur une annonce";
    case "estimation": return "Demande d’estimation";
    case "favorites_share": return "Sélection de biens partagée";
    default: return "Demande de contact";
  }
}

function getSourceLabel(source: z.infer<typeof payloadSchema>["source"]): string {
  switch (source) {
    case "property_page": return "Depuis une annonce";
    case "estimation": return "Estimation";
    case "favorites_share": return "Sélection de biens";
    default: return "Contact";
  }
}

function formatCityLabel(value?: string): string | null {
  const candidate = value?.trim().replace(/^city-/i, "").replaceAll("_", " ").replaceAll("-", " ");
  if (!candidate || uuidPattern.test(candidate)) return null;

  return candidate
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toLocaleUpperCase("fr-FR")}${word.slice(1)}`)
    .join(" ");
}

function getLeadEmailMessage(payload: z.infer<typeof payloadSchema>): string {
  const chatbotMatch = payload.message.match(/^Demande chatbot\s*-\s*aucun bien trouvé\s*(?:Critères:\s*([\s\S]*))?$/i);
  if (!chatbotMatch) return payload.message;

  const criteria = chatbotMatch[1]?.trim();
  return criteria
    ? `Le client n’a pas trouvé de bien correspondant à ces critères.\n\nRecherche souhaitée : ${criteria}`
    : "Le client n’a pas trouvé de bien correspondant à sa recherche.";
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
      lead: Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "website" && key !== "formStartedAt")),
      chatbotContext: payload.chatbotContext ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lead webhook failed (${response.status})`);
  }
}

async function sendResendNotification(payload: z.infer<typeof payloadSchema>): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const to = Deno.env.get("LEADS_NOTIFICATION_EMAIL") ?? "nicolaslivapro@gmail.com";
  const from = Deno.env.get("LEADS_FROM_EMAIL") ?? "Foch Immobilier <vendre@fochimmobilier.com>";
  const replyTo = payload.email;
  const requestTitle = getRequestTitle(payload.source);
  const sourceLabel = getSourceLabel(payload.source);
  const fullName = `${payload.firstName} ${payload.lastName}`.replace(/[\r\n]+/g, " ").trim();
  const isTest = /\btest\b/i.test(fullName);
  const subject = `${isTest ? "[TEST] " : ""}${requestTitle} — ${fullName}`.slice(0, 180);
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date());
  const displayedMessage = getLeadEmailMessage(payload);
  const cityLabel = formatCityLabel(payload.cityId);
  const detailRows: Array<{ label: string; value: string; href?: string }> = [
    { label: "E-mail", value: payload.email, href: `mailto:${payload.email}` },
  ];

  if (payload.phone) {
    detailRows.push({
      label: "Téléphone",
      value: payload.phone,
      href: `tel:${payload.phone.replace(/[^\d+]/g, "")}`,
    });
  }
  if (cityLabel) detailRows.push({ label: "Ville", value: cityLabel });
  if (payload.propertyId) detailRows.push({ label: "Annonce concernée", value: `Réf. ${payload.propertyId}` });
  if (payload.callbackWindow) {
    const callbackLabels: Record<string, string> = {
      morning: "Le matin",
      afternoon: "L’après-midi",
      evening: "En soirée",
    };
    detailRows.push({ label: "Rappel souhaité", value: callbackLabels[payload.callbackWindow] ?? payload.callbackWindow });
  }
  if (payload.preferredDates?.length) {
    detailRows.push({ label: "Disponibilités", value: payload.preferredDates.join(" · ") });
  }
  if (payload.financingStatus && payload.financingStatus !== "not_defined") {
    const financingLabels: Record<string, string> = {
      cash: "Achat comptant",
      mortgage_in_progress: "Crédit en cours",
      needs_financing: "Financement à prévoir",
    };
    detailRows.push({ label: "Financement", value: financingLabels[payload.financingStatus] ?? payload.financingStatus });
  }
  if (payload.chatbotContext) detailRows.push({ label: "Origine", value: "Assistant en ligne" });

  const safeFullName = escapeHtml(fullName);
  const safeRequestTitle = escapeHtml(requestTitle);
  const safeSubject = encodeURIComponent(`Re : ${requestTitle} — ${fullName}`);
  const replyUrl = `mailto:${payload.email}?subject=${safeSubject}`;
  const safeMessage = escapeHtml(displayedMessage).replace(/\r?\n/g, "<br>");
  const detailRowsHtml = detailRows.map(({ label, value, href }) => `
    <tr>
      <td style="padding:11px 14px;border-bottom:1px solid #e9e8e2;color:#66706d;font-size:13px;vertical-align:top;width:34%">${escapeHtml(label)}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #e9e8e2;color:#1f2926;font-size:14px;vertical-align:top;word-break:break-word">${href
        ? `<a href="${escapeHtml(href)}" style="color:#21564c;text-decoration:underline">${escapeHtml(value)}</a>`
        : escapeHtml(value)}</td>
    </tr>`).join("");
  const textDetails = detailRows.map(({ label, value }) => `${label} : ${value}`).join("\n");
  const text = [
    `FOCH IMMOBILIER — ${requestTitle}`,
    `Reçu le ${dateLabel}`,
    "",
    `Demandeur : ${fullName}`,
    textDetails,
    "",
    "Message :",
    displayedMessage,
    "",
    `Répondre : ${replyUrl}`,
    "Foch Immobilier · Le Havre",
  ].filter(Boolean).join("\n");
  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f2f2ee;color:#1f2926;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${safeRequestTitle} de ${safeFullName}. Répondez directement au demandeur.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2ee;border-collapse:collapse">
      <tr><td align="center" style="padding:28px 14px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;border-collapse:separate;border-spacing:0">
          <tr>
            <td style="padding:21px 28px;background:#183b35;border-radius:12px 12px 0 0;color:#fff">
              <span style="font-size:13px;font-weight:700;letter-spacing:2px">FOCH IMMOBILIER</span>
              <span style="float:right;color:#d7e3df;font-size:12px;letter-spacing:.4px">DEMANDE ENTRANTE</span>
            </td>
          </tr>
          <tr><td style="padding:30px 28px 28px;background:#fff;border:1px solid #e6e6df;border-top:0">
            <p style="margin:0 0 9px;color:#7a6849;font-size:12px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase">${escapeHtml(sourceLabel)}</p>
            <h1 style="margin:0;color:#1c2925;font-size:25px;line-height:1.25;font-weight:700">${safeRequestTitle}</h1>
            <p style="margin:9px 0 22px;color:#707976;font-size:14px;line-height:1.6">${safeFullName} vous a écrit depuis le site.</p>
            ${isTest ? `<p style="margin:0 0 18px;padding:10px 12px;border-radius:6px;background:#fff4dc;color:#76520a;font-size:12px;font-weight:700">E-mail de test — ne pas traiter comme une demande client.</p>` : ""}
            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 25px">
              <tr><td bgcolor="#183b35" style="border-radius:6px">
                <a href="${escapeHtml(replyUrl)}" style="display:inline-block;padding:12px 18px;color:#fff;font-size:14px;font-weight:700;text-decoration:none">Répondre à ${escapeHtml(payload.firstName)}</a>
              </td></tr>
            </table>
            <h2 style="margin:0 0 10px;color:#26332f;font-size:15px;font-weight:700">Coordonnées</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e9e8e2;border-collapse:collapse;background:#fbfbf9">
              ${detailRowsHtml}
            </table>
            <h2 style="margin:25px 0 10px;color:#26332f;font-size:15px;font-weight:700">Message</h2>
            <div style="padding:16px 18px;border-left:3px solid #b69a68;border-radius:0 6px 6px 0;background:#f7f6f2;color:#303936;font-size:14px;line-height:1.7;word-break:break-word">${safeMessage}</div>
            <p style="margin:22px 0 0;color:#818985;font-size:12px;line-height:1.5">Reçu le ${escapeHtml(dateLabel)}</p>
          </td></tr>
          <tr><td style="padding:15px 10px;color:#858b87;font-size:11px;line-height:1.5;text-align:center">Foch Immobilier · Le Havre · <a href="https://www.fochimmobilier.com" style="color:#5b6c65;text-decoration:underline">fochimmobilier.com</a></td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

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
      text,
      reply_to: replyTo,
    }),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    const errorCode = typeof responseBody?.name === "string"
      ? responseBody.name
      : typeof responseBody?.code === "string"
        ? responseBody.code
        : "";
    const errorMessage = typeof responseBody?.message === "string"
      ? responseBody.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted email]").slice(0, 240)
      : "";
    const details = [errorCode, errorMessage].filter(Boolean).join(": ");
    throw new Error(`Resend rejected notification (HTTP ${response.status}${details ? `; ${details}` : ""}).`);
  }

  console.info(`Lead notification email accepted by Resend (HTTP ${response.status}).`);
}

async function notifyLead(payload: z.infer<typeof payloadSchema>, assignedAgentId: string | null): Promise<void> {
  const [webhookResult, emailResult] = await Promise.allSettled([
    sendWebhookNotification(payload, assignedAgentId),
    sendResendNotification(payload),
  ]);

  if (webhookResult.status === "rejected") {
    console.error("Lead webhook notification failed.", webhookResult.reason instanceof Error ? webhookResult.reason.message : "Unknown error");
  }

  if (emailResult.status === "rejected") {
    console.error("Lead email notification failed.", emailResult.reason instanceof Error ? emailResult.reason.message : "Unknown error");
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return secureOptionsResponse(request);
  }

  if (request.method !== "POST") {
    return secureJsonResponse(request, { ok: false, error: "Method not allowed" }, 405);
  }

  const expectedProxyToken = (Deno.env.get("LEADS_PROXY_TOKEN") ?? "").trim();
  const suppliedProxyToken = request.headers.get("x-leads-proxy-token") ?? "";
  if (!expectedProxyToken || suppliedProxyToken !== expectedProxyToken) {
    return secureJsonResponse(request, { ok: false, error: "Submission unavailable." }, 403);
  }

  if (!isAllowedSiteOrigin(request.headers.get("origin"))) {
    return secureJsonResponse(request, { ok: false, error: "Submission unavailable." }, 403);
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return secureJsonResponse(request, { ok: false, error: "Invalid submission." }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > 16_384) {
    return secureJsonResponse(request, { ok: false, error: "Invalid submission." }, 413);
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return secureJsonResponse(request, { ok: false, error: "Invalid submission." }, 400);
  }
  if (new TextEncoder().encode(rawText).byteLength > 16_384) {
    return secureJsonResponse(request, { ok: false, error: "Invalid submission." }, 413);
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawText);
  } catch {
    return secureJsonResponse(request, { ok: false, error: "Invalid submission." }, 400);
  }

  const parsedPayload = payloadSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return secureJsonResponse(request, { ok: false, error: "Please check the form fields and try again." }, 400);
  }
  const payload = parsedPayload.data;

  // Reply normally to common form-filling bots without storing a lead.
  if (payload.website?.trim()) {
    return secureJsonResponse(request, { ok: true, leadId: crypto.randomUUID(), assignedAgentId: null });
  }

  const elapsedMs = Date.now() - payload.formStartedAt;
  if (elapsedMs < 1_500 || elapsedMs < -60_000) {
    return secureJsonResponse(request, { ok: false, error: "Please wait a moment and try again." }, 400);
  }

  try {
    const supabase = createServiceClient();
    const withinShortLimit = await consumeRequestLimit(supabase, request, "lead-submission-short", 5, 900);
    const withinDailyLimit = withinShortLimit && await consumeRequestLimit(supabase, request, "lead-submission-daily", 15, 86_400);
    if (!withinShortLimit || !withinDailyLimit) {
      return secureJsonResponse(request, { ok: false, error: "Too many requests. Please try again later." }, 429);
    }

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
          return secureJsonResponse(request, { ok: false, error: "Please check the selected city and try again." }, 400);
        }

        normalizedCityId = cityBySlug.id;
      }
    }

    let assignedAgentId: string | null = null;

    if (payload.propertyId) {
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("agent_id")
        .eq("id", payload.propertyId)
        .eq("is_online", true)
        .maybeSingle();
      if (propertyError) throw propertyError;
      if (!propertyData) {
        return secureJsonResponse(request, { ok: false, error: "This property is no longer available online." }, 400);
      }
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

    const ipHash = await getRequestIpHash(request);
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

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
        ip_hash: ipHash,
        user_agent: userAgent,
        assigned_agent_id: assignedAgentId,
        status: assignedAgentId ? "assigned" : "new",
      })
      .select("id")
      .single();

    if (error) throw error;

    await notifyLead(payload, assignedAgentId);

    return secureJsonResponse(request, { ok: true, leadId: data.id, assignedAgentId });
  } catch (error) {
    console.error("Lead submission failed.", error instanceof Error ? error.message : "Unknown error");
    return secureJsonResponse(request, { ok: false, error: "We could not send your request. Please try again." }, 500);
  }
});
