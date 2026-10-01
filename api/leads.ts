declare const process: { env: Record<string, string | undefined> };

const allowedOrigins = new Set([
  "https://foch-horizon.vercel.app",
  "https://foch-horizon-primzarks-projects.vercel.app",
]);

const supabaseLeadsUrl = "https://rcrulfdobtmfxzpuyryn.supabase.co/functions/v1/leads-create";
const maxBodyBytes = 16_384;

function jsonResponse(payload: unknown, status: number, origin: string | null): Response {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "Vary": "Origin",
  });

  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }

  return new Response(status === 204 ? null : JSON.stringify(payload), { status, headers });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get("origin");

    if (request.method === "OPTIONS") {
      return allowedOrigins.has(origin ?? "")
        ? jsonResponse({ ok: true }, 204, origin)
        : jsonResponse({ ok: false, error: "Submission unavailable." }, 403, null);
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed" }, 405, origin);
    }

    if (!origin || !allowedOrigins.has(origin)) {
      return jsonResponse({ ok: false, error: "Submission unavailable." }, 403, null);
    }

    const proxyToken = process.env.LEADS_PROXY_TOKEN?.trim();
    if (!proxyToken) {
      return jsonResponse({ ok: false, error: "Submission unavailable." }, 503, origin);
    }

    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    const declaredLength = request.headers.get("content-length");
    if (!contentType.includes("application/json") || (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBodyBytes))) {
      return jsonResponse({ ok: false, error: "Invalid submission." }, 400, origin);
    }

    let body: string;
    try {
      body = await request.text();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid submission." }, 400, origin);
    }
    if (new TextEncoder().encode(body).byteLength > maxBodyBytes) {
      return jsonResponse({ ok: false, error: "Invalid submission." }, 413, origin);
    }

    const headers = new Headers({
      "Content-Type": "application/json",
      "Origin": origin,
      "x-leads-proxy-token": proxyToken,
    });

    const apiKey = request.headers.get("apikey");
    const authorization = request.headers.get("authorization");
    if (apiKey && apiKey.length <= 4096) headers.set("apikey", apiKey);
    if (authorization && authorization.length <= 4096) headers.set("authorization", authorization);

    // Vercel overwrites this platform header with the requester's IP, so the
    // edge function can apply per-client limits without trusting browser input.
    const clientIp = request.headers.get("x-vercel-forwarded-for")?.trim();
    if (clientIp && clientIp.length <= 128) headers.set("x-site-client-ip", clientIp);

    try {
      const edgeResponse = await fetch(supabaseLeadsUrl, {
        method: "POST",
        headers,
        body,
        redirect: "manual",
      });
      const responseHeaders = new Headers({
        "Cache-Control": "no-store",
        "Content-Type": edgeResponse.headers.get("content-type") ?? "application/json",
      });
      const allowedOrigin = edgeResponse.headers.get("access-control-allow-origin");
      if (allowedOrigin === origin) responseHeaders.set("Access-Control-Allow-Origin", origin);
      responseHeaders.set("Vary", "Origin");

      return new Response(edgeResponse.body, { status: edgeResponse.status, headers: responseHeaders });
    } catch {
      return jsonResponse({ ok: false, error: "The form could not be submitted. Please try again." }, 503, origin);
    }
  },
};
