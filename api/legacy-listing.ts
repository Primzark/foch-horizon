export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const url = new URL(request.url);
    const ref = url.pathname.match(/^\/annonce\/(\d+)\/?$/)?.[1] ?? url.searchParams.get("listingRef") ?? "";
    const id = Number(ref);
    if (!/^\d+$/.test(ref) || !Number.isSafeInteger(id) || id <= 0) {
      return new Response(null, { status: 404 });
    }

    const projectUrl = process.env.SUPABASE_URL?.trim()
      || process.env.VITE_SUPABASE_PROJECT_URL?.trim()
      || "https://rcrulfdobtmfxzpuyryn.supabase.co";
    const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim();
    const unavailable = () => new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
    if (!anonKey) return unavailable();

    try {
      const response = await fetch(new URL(`/functions/v1/property-detail/${id}`, projectUrl), {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (response.status === 404 || response.status === 410) {
        return new Response(null, { status: response.status });
      }
      if (!response.ok) return unavailable();

      const listing = await response.json();
      if (listing.id !== id || typeof listing.slug !== "string") return unavailable();
      if (listing.is_online === false || listing.status === "off_market") {
        return new Response(null, { status: 404 });
      }
      const slug = listing.slug.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const suffix = `-${id}`;
      const canonicalSlug = slug.endsWith(suffix) ? slug.slice(0, -suffix.length) : slug;
      return new Response(null, {
        status: 308,
        headers: { Location: `/biens/${id}-${canonicalSlug || "annonce"}`, "Cache-Control": "public, max-age=300" },
      });
    } catch {
      return unavailable();
    }
  },
};
