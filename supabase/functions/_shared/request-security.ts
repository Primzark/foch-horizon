import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const defaultAllowedOrigins = new Set([
  "https://foch-horizon.vercel.app",
  "https://foch-horizon-primzarks-projects.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

export function isAllowedSiteOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const configuredOrigins = (Deno.env.get("SITE_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return defaultAllowedOrigins.has(origin) || configuredOrigins.includes(origin);
}

export function getSiteCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowOrigin = isAllowedSiteOrigin(origin) ? origin! : "https://foch-horizon.vercel.app";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
}

export function secureJsonResponse(request: Request, payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...getSiteCorsHeaders(request), "Content-Type": "application/json" },
  });
}

export function secureOptionsResponse(request: Request): Response {
  return new Response(null, { headers: getSiteCorsHeaders(request) });
}

function getClientIp(request: Request): string | null {
  const leadProxyToken = Deno.env.get("LEADS_PROXY_TOKEN") ?? "";
  if (leadProxyToken && request.headers.get("x-leads-proxy-token") === leadProxyToken) {
    const trustedProxyIp = request.headers.get("x-site-client-ip")?.split(",")[0]?.trim();
    if (trustedProxyIp) return trustedProxyIp;
  }

  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getRequestIpHash(request: Request): Promise<string | null> {
  const clientIp = getClientIp(request);
  const hashPepper = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return clientIp && hashPepper ? await sha256Hex(`${hashPepper}\u0000${clientIp}`) : null;
}

export async function consumeRequestLimit(
  supabase: SupabaseClient,
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const keyHash = await getRequestIpHash(request);
  if (!keyHash) return false;
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_scope: scope,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) throw error;
  return data === true;
}
