import { z } from "https://esm.sh/zod@3.25.76";
import { createServiceClient } from "../_shared/client.ts";
import {
  consumeRequestLimit,
  isAllowedSiteOrigin,
  secureJsonResponse,
  secureOptionsResponse,
} from "../_shared/request-security.ts";

const criteriaSchema = z.object({
  transaction: z.enum(["vente"]).optional(),
  type: z.enum(["appartement", "maison_villa", "autre"]).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  bedroomsMin: z.number().finite().int().min(0).max(30).optional(),
  bathroomsMin: z.number().finite().min(0).max(30).optional(),
  garagesMin: z.number().finite().int().min(0).max(30).optional(),
  priceMin: z.number().finite().min(0).max(100_000_000).optional(),
  priceMax: z.number().finite().min(0).max(100_000_000).optional(),
  surfaceMin: z.number().finite().min(0).max(100_000).optional(),
  surfaceMax: z.number().finite().min(0).max(100_000).optional(),
  terrainMin: z.number().finite().min(0).max(1_000_000).optional(),
  terrainMax: z.number().finite().min(0).max(1_000_000).optional(),
  features: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
}).strict().transform((criteria) => ({
  ...criteria,
  ...(criteria.features ? { features: [...new Set(criteria.features)].sort() } : {}),
}));

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("subscribe"),
    email: z.string().trim().email().max(254),
    criteria: criteriaSchema,
    consent: z.literal(true),
  }).strict(),
  z.object({ action: z.literal("confirm"), token: z.string().min(20).max(512) }).strict(),
  z.object({ action: z.literal("unsubscribe"), token: z.string().min(20).max(512) }).strict(),
  z.object({ action: z.literal("dispatch") }).strict(),
]);

type PropertyAlertCriteria = z.infer<typeof criteriaSchema>;
type ClaimedConfirmation = {
  subscription_id: string;
  email: string;
  confirmation_expires_at: string;
  attempts: number;
};
type ClaimedDelivery = {
  delivery_id: string;
  subscription_id: string;
  property_id: number;
  attempts: number;
};
type PropertyRecord = {
  id: number;
  title: string;
  slug: string;
  transaction_type: string;
  property_type: string;
  status: string;
  price_amount: number;
  surface_m2: number | null;
  bedrooms: number | null;
  city: { name?: string | null } | null;
  images: Array<{ source_url?: string | null; sort_order?: number | null }> | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const configuredSiteUrl = (
  Deno.env.get("PROPERTY_ALERTS_SITE_URL") ??
  Deno.env.get("PUBLIC_SITE_URL") ??
  "https://foch-horizon.vercel.app"
);
const siteUrl = (() => {
  try {
    const url = new URL(configuredSiteUrl);
    if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
  } catch {
    // Use the public Vercel domain when an optional site URL is malformed.
  }
  return "https://foch-horizon.vercel.app";
})();

function response(request: Request, payload: unknown, status = 200): Response {
  return secureJsonResponse(request, payload, status);
}

function constantTimeEquals(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function getTokenSecret(): string {
  const secret = Deno.env.get("PROPERTY_ALERT_TOKEN_SECRET") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!secret) throw new Error("Property alert token signing is not configured.");
  return secret;
}

async function signTokenValue(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getTokenSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createConfirmationToken(subscriptionId: string, expiresAt: string): Promise<string> {
  const expires = Math.floor(new Date(expiresAt).getTime() / 1000);
  const value = `confirm:${subscriptionId}:${expires}`;
  return `${subscriptionId}.${expires}.${await signTokenValue(value)}`;
}

async function createUnsubscribeToken(subscriptionId: string): Promise<string> {
  return `${subscriptionId}.${await signTokenValue(`unsubscribe:${subscriptionId}`)}`;
}

async function verifyToken(token: string, kind: "confirm" | "unsubscribe"): Promise<{ subscriptionId: string } | null> {
  const parts = token.split(".");
  const subscriptionId = parts[0] ?? "";
  if (!uuidPattern.test(subscriptionId)) return null;

  if (kind === "confirm") {
    const expires = Number(parts[1]);
    const signature = parts[2] ?? "";
    if (parts.length !== 3 || !Number.isSafeInteger(expires) || expires * 1000 < Date.now()) return null;
    const expected = await signTokenValue(`confirm:${subscriptionId}:${expires}`);
    return constantTimeEquals(signature, expected) ? { subscriptionId } : null;
  }

  const signature = parts[1] ?? "";
  if (parts.length !== 2) return null;
  const expected = await signTokenValue(`unsubscribe:${subscriptionId}`);
  return constantTimeEquals(signature, expected) ? { subscriptionId } : null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function absoluteSiteUrl(path: string): string {
  const configured = new URL(siteUrl);
  return new URL(path, configured).toString();
}

function propertyPath(property: Pick<PropertyRecord, "id" | "slug">): string {
  const slug = property.slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "annonce";
  return `/biens/${property.id}-${slug}`;
}

async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const from = Deno.env.get("LEADS_FROM_EMAIL") ?? "Foch Immobilier <leads@fochimmobilier.com>";
  const replyTo = Deno.env.get("LEADS_REPLY_TO_EMAIL") ?? "nicolaslivapro@gmail.com";
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html, reply_to: replyTo }),
  });

  if (!result.ok) {
    const details = await result.text().catch(() => "");
    throw new Error(`Resend request failed (${result.status}): ${details.slice(0, 400)}`);
  }
}

async function sendConfirmationEmails(
  supabase: ReturnType<typeof createServiceClient>,
  limit = 20,
  subscriptionId?: string,
): Promise<{ sent: number; failed: number }> {
  const { data, error } = await supabase.rpc("claim_property_alert_confirmations", {
    p_limit: limit,
    p_subscription_id: subscriptionId ?? null,
  });
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const row of (data ?? []) as ClaimedConfirmation[]) {
    try {
      const token = await createConfirmationToken(row.subscription_id, row.confirmation_expires_at);
      const confirmationUrl = new URL("/alertes/confirmation", siteUrl);
      confirmationUrl.searchParams.set("token", token);
      const html = `
        <div style="font-family:Arial,sans-serif;color:#17202a;line-height:1.6;max-width:600px;margin:auto">
          <h1 style="font-size:24px">Confirmez votre alerte Foch Immobilier</h1>
          <p>Vous avez demandé à recevoir les nouvelles annonces correspondant à vos critères.</p>
          <p><a href="${escapeHtml(confirmationUrl.toString())}" style="display:inline-block;background:#183b35;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">Confirmer mon adresse e-mail</a></p>
          <p>Les annonces déjà publiées ne seront pas envoyées. Ce lien expire dans 48 heures.</p>
          <p style="font-size:12px;color:#5b6470">Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>
        </div>`;
      const expires = Math.floor(new Date(row.confirmation_expires_at).getTime() / 1000);
      await sendResendEmail({
        to: row.email,
        subject: "Confirmez votre alerte immobilière",
        html,
        idempotencyKey: `foch-alert-confirm-${row.subscription_id}-${expires}`,
      });
      const { error: completeError } = await supabase.rpc("complete_property_alert_confirmation", {
        p_subscription_id: row.subscription_id,
        p_sent: true,
        p_error: null,
      });
      if (completeError) throw completeError;
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Confirmation email failed.";
      await supabase.rpc("complete_property_alert_confirmation", {
        p_subscription_id: row.subscription_id,
        p_sent: false,
        p_error: message,
      });
      console.error("Property alert confirmation delivery failed.", { subscriptionId: row.subscription_id });
      failed += 1;
    }
  }

  return { sent, failed };
}

async function loadProperty(supabase: ReturnType<typeof createServiceClient>, propertyId: number): Promise<PropertyRecord | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("id,title,slug,transaction_type,property_type,status,price_amount,surface_m2,bedrooms,city:cities(name),images:property_images(source_url,sort_order)")
    .eq("id", propertyId)
    .eq("is_online", true)
    .maybeSingle();
  if (error) throw error;
  return data as PropertyRecord | null;
}

async function sendPropertyAlert(
  supabase: ReturnType<typeof createServiceClient>,
  delivery: ClaimedDelivery,
): Promise<"sent" | "failed" | "cancelled"> {
  const { data: subscription, error: subscriptionError } = await supabase
    .from("property_alert_subscriptions")
    .select("email,confirmed_at,unsubscribed_at")
    .eq("id", delivery.subscription_id)
    .maybeSingle();
  if (subscriptionError) throw subscriptionError;
  if (!subscription || !subscription.confirmed_at || subscription.unsubscribed_at) return "cancelled";

  const property = await loadProperty(supabase, delivery.property_id);
  if (!property || !["active", "new", "exclusive", "price_reduced"].includes(property.status)) return "cancelled";

  const propertyUrl = absoluteSiteUrl(propertyPath(property));
  const unsubscribeToken = await createUnsubscribeToken(delivery.subscription_id);
  const unsubscribeUrl = new URL("/alertes/desabonnement", siteUrl);
  unsubscribeUrl.searchParams.set("token", unsubscribeToken);
  const imageUrl = property.images
    ?.slice()
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    .find((image) => {
      if (!image.source_url) return false;
      try {
        const imageUrl = new URL(image.source_url);
        return imageUrl.protocol === "https:" || imageUrl.protocol === "http:";
      } catch {
        return false;
      }
    })?.source_url;
  const details = [
    property.city?.name,
    property.surface_m2 != null ? `${new Intl.NumberFormat("fr-FR").format(property.surface_m2)} m²` : null,
    property.bedrooms != null ? `${property.bedrooms} chambre${property.bedrooms > 1 ? "s" : ""}` : null,
  ].filter((value): value is string => typeof value === "string" && value.length > 0).map(escapeHtml).join(" · ");
  const formattedPrice = `${new Intl.NumberFormat("fr-FR").format(property.price_amount)} €`;
  const safeTitle = escapeHtml(property.title);
  const imageBlock = imageUrl
    ? `<a href="${escapeHtml(propertyUrl)}"><img src="${escapeHtml(imageUrl)}" alt="${safeTitle}" style="display:block;width:100%;max-height:320px;object-fit:cover;border-radius:10px" /></a>`
    : "";
  const html = `
    <div style="font-family:Arial,sans-serif;color:#17202a;line-height:1.6;max-width:600px;margin:auto">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#53645f">Nouvelle annonce correspondant à votre recherche</p>
      ${imageBlock}
      <h1 style="font-size:24px;margin-bottom:6px">${safeTitle}</h1>
      ${details ? `<p style="color:#53645f;margin-top:0">${details}</p>` : ""}
      <p style="font-size:20px;font-weight:bold">${formattedPrice}</p>
      <p><a href="${escapeHtml(propertyUrl)}" style="display:inline-block;background:#183b35;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">Voir le bien</a></p>
      <hr style="border:0;border-top:1px solid #e4e7e5;margin:28px 0" />
      <p style="font-size:12px;color:#69736f">Vous recevez cet e-mail parce que vous avez créé une alerte sur le site Foch Immobilier. <a href="${escapeHtml(unsubscribeUrl.toString())}">Arrêter cette alerte</a>.</p>
    </div>`;

  await sendResendEmail({
    to: subscription.email,
    subject: `Nouvelle annonce : ${property.title.replace(/[\r\n]+/g, " ").slice(0, 180)}`,
    html,
    idempotencyKey: `foch-alert-property-${delivery.delivery_id}`,
  });
  return "sent";
}

async function dispatchPendingEmails(supabase: ReturnType<typeof createServiceClient>) {
  const confirmations = await sendConfirmationEmails(supabase, 40);
  const { data: queuedCount, error: enqueueError } = await supabase.rpc("enqueue_property_alert_deliveries", { p_limit: 500 });
  if (enqueueError) throw enqueueError;

  const { data, error } = await supabase.rpc("claim_property_alert_deliveries", { p_limit: 200 });
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  let cancelled = 0;
  const deliveries = (data ?? []) as ClaimedDelivery[];
  for (let offset = 0; offset < deliveries.length; offset += 4) {
    const batch = deliveries.slice(offset, offset + 4);
    await Promise.all(batch.map(async (delivery) => {
      let result: "sent" | "failed" | "cancelled" = "failed";
      let message: string | null = null;
      try {
        result = await sendPropertyAlert(supabase, delivery);
      } catch (error) {
        message = error instanceof Error ? error.message : "Property alert email failed.";
        console.error("Property alert delivery failed.", { deliveryId: delivery.delivery_id });
      }

      const { error: completeError } = await supabase.rpc("complete_property_alert_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_result: result,
        p_error: message,
      });
      if (completeError) {
        console.error("Could not save property alert delivery status.", { deliveryId: delivery.delivery_id });
      } else if (result === "sent") {
        sent += 1;
      } else if (result === "cancelled") {
        cancelled += 1;
      } else {
        failed += 1;
      }
    }));
  }

  return { queued: queuedCount ?? 0, confirmations, deliveries: { claimed: deliveries.length, sent, failed, cancelled } };
}

async function handleSubscribe(
  request: Request,
  supabase: ReturnType<typeof createServiceClient>,
  input: Extract<z.infer<typeof requestSchema>, { action: "subscribe" }>,
): Promise<Response> {
  if (!await consumeRequestLimit(supabase, request, "property-alert-subscribe", 5, 60 * 60)) {
    return response(request, { error: "Trop de demandes. Réessayez un peu plus tard." }, 429);
  }

  const criteria = input.criteria as PropertyAlertCriteria;
  const criteriaHash = await sha256Hex(JSON.stringify(criteria));
  const { data, error } = await supabase.rpc("upsert_property_alert_subscription", {
    p_email: input.email.toLowerCase(),
    p_criteria: criteria,
    p_criteria_hash: criteriaHash,
    p_consent_at: new Date().toISOString(),
    p_confirmation_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (row?.subscription_id && !row.already_confirmed) {
    const confirmations = await sendConfirmationEmails(supabase, 1, row.subscription_id);
    const { data: latestSubscription, error: lookupError } = await supabase
      .from("property_alert_subscriptions")
      .select("confirmation_email_status")
      .eq("id", row.subscription_id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    return response(request, {
      ok: true,
      confirmationEmailQueued: confirmations.failed > 0 || latestSubscription?.confirmation_email_status !== "sent",
    });
  }

  return response(request, { ok: true, confirmationEmailQueued: false });
}

async function handleConfirm(
  request: Request,
  supabase: ReturnType<typeof createServiceClient>,
  token: string,
): Promise<Response> {
  if (!await consumeRequestLimit(supabase, request, "property-alert-confirm", 30, 60 * 60)) {
    return response(request, { error: "Trop de tentatives. Réessayez un peu plus tard." }, 429);
  }
  const verified = await verifyToken(token, "confirm");
  if (!verified) return response(request, { error: "Ce lien est invalide ou expiré. Créez une nouvelle alerte pour recevoir un autre lien." }, 400);

  const { data, error } = await supabase.rpc("confirm_property_alert_subscription", {
    p_subscription_id: verified.subscriptionId,
  });
  if (error) throw error;
  if (data !== true) return response(request, { error: "Ce lien est invalide ou expiré. Créez une nouvelle alerte pour recevoir un autre lien." }, 400);
  return response(request, { ok: true, confirmed: true });
}

async function handleUnsubscribe(
  request: Request,
  supabase: ReturnType<typeof createServiceClient>,
  token: string,
): Promise<Response> {
  if (!await consumeRequestLimit(supabase, request, "property-alert-unsubscribe", 30, 60 * 60)) {
    return response(request, { error: "Trop de tentatives. Réessayez un peu plus tard." }, 429);
  }
  const verified = await verifyToken(token, "unsubscribe");
  if (!verified) return response(request, { error: "Ce lien de désabonnement est invalide." }, 400);

  const { data, error } = await supabase.rpc("unsubscribe_property_alert_subscription", {
    p_subscription_id: verified.subscriptionId,
  });
  if (error) throw error;
  if (data !== true) return response(request, { error: "Ce lien de désabonnement est invalide." }, 400);
  return response(request, { ok: true, unsubscribed: true });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return secureOptionsResponse(request);
  if (request.method !== "POST") return response(request, { error: "Method not allowed." }, 405);

  const expectedLength = Number(request.headers.get("content-length") ?? 0);
  if (expectedLength > 32_000) return response(request, { error: "Request too large." }, 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response(request, { error: "Invalid JSON body." }, 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return response(request, { error: "Invalid property alert request." }, 400);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const isDispatch = parsed.data.action === "dispatch";
  if (isDispatch) {
    if (!serviceKey || !constantTimeEquals(request.headers.get("authorization") ?? "", `Bearer ${serviceKey}`)) {
      return response(request, { error: "Unauthorized." }, 401);
    }
  } else if (!isAllowedSiteOrigin(request.headers.get("origin"))) {
    return response(request, { error: "Origin not allowed." }, 403);
  }

  try {
    const supabase = createServiceClient();
    if (parsed.data.action === "subscribe") return await handleSubscribe(request, supabase, parsed.data);
    if (parsed.data.action === "confirm") return await handleConfirm(request, supabase, parsed.data.token);
    if (parsed.data.action === "unsubscribe") return await handleUnsubscribe(request, supabase, parsed.data.token);
    return response(request, { ok: true, ...await dispatchPendingEmails(supabase) });
  } catch (error) {
    console.error("Property alert request failed.", error instanceof Error ? error.message : "Unknown error");
    return response(request, { error: "Le service d’alerte est temporairement indisponible." }, 500);
  }
});
