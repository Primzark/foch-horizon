declare const process: { env: Record<string, string | undefined> };

type PropertyFeedItem = {
  id: number;
  title: string;
  slug: string;
  transaction?: string;
  priceAmount: number;
  currency?: string;
  surfaceM2?: number | null;
  bedrooms?: number | null;
  city?: { name?: string; postalCode?: string };
  coverImageUrl?: string;
  description?: string;
  status?: string;
  adminStatusOverride?: string | null;
};

type PropertySearchPage = {
  pageSize: number;
  total: number;
  items: PropertyFeedItem[];
};

const PAGE_SIZE = 100;
const MAX_PAGES = 25;
const availableStatuses = new Set(["active", "new", "exclusive", "price_reduced"]);

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function plainText(value: unknown, maxLength = 2000): string {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maxLength);
}

function propertyPath(property: Pick<PropertyFeedItem, "id" | "slug">): string {
  let slug = plainText(property.slug, 200)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  const idSuffix = `-${property.id}`;
  if (slug.endsWith(idSuffix)) slug = slug.slice(0, -idSuffix.length);
  return `/biens/${property.id}-${slug || "annonce"}`;
}

function isImageUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function formatPrice(amount: number, currency: string | undefined): string {
  const price = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount);
  return `${price} ${currency === "EUR" || !currency ? "€" : currency}`;
}

function propertyDescription(property: PropertyFeedItem): string {
  const details = [
    property.city?.name,
    property.city?.postalCode,
    Number.isFinite(property.surfaceM2) && Number(property.surfaceM2) > 0 ? `${property.surfaceM2} m²` : null,
    Number.isFinite(property.bedrooms) && Number(property.bedrooms) > 0
      ? `${property.bedrooms} chambre${property.bedrooms === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean).join(" · ");
  const description = plainText(property.description, 1600);
  return [formatPrice(property.priceAmount, property.currency), details, description]
    .filter(Boolean)
    .join(" — ");
}

function rssItem(property: PropertyFeedItem, siteUrl: string): string {
  const link = `${siteUrl}${propertyPath(property)}`;
  const title = [plainText(property.title, 180), plainText(property.city?.name, 100)].filter(Boolean).join(" · ");
  const image = isImageUrl(property.coverImageUrl)
    ? `\n      <media:content url="${xmlEscape(property.coverImageUrl)}" medium="image" />`
    : "";

  return [
    "    <item>",
    `      <title>${xmlEscape(title)}</title>`,
    `      <link>${xmlEscape(link)}</link>`,
    `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
    `      <description>${xmlEscape(propertyDescription(property))}</description>`,
    `      <category>${xmlEscape("Bien à vendre")}</category>`,
    `      <source url="${xmlEscape(`${siteUrl}/feeds/properties-for-sale.xml`)}">Foch Immobilier</source>${image}`,
    "    </item>",
  ].join("\n");
}

function xmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": status === 200 ? "public, max-age=60, s-maxage=300, stale-while-revalidate=600" : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function fetchPage(
  projectUrl: string,
  anonKey: string,
  page: number,
): Promise<PropertySearchPage> {
  const endpoint = new URL(`${projectUrl.replace(/\/$/, "")}/functions/v1/properties-search`);
  endpoint.searchParams.set("transaction", "vente");
  endpoint.searchParams.set("page", String(page));
  endpoint.searchParams.set("pageSize", String(PAGE_SIZE));
  endpoint.searchParams.set("sort", "newest");
  endpoint.searchParams.set("includeDescription", "true");

  const response = await fetch(endpoint, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Property inventory returned ${response.status}.`);

  const payload = await response.json() as Partial<PropertySearchPage>;
  if (!Array.isArray(payload.items) || !Number.isFinite(payload.total)) {
    throw new Error("Property inventory returned an invalid response.");
  }
  return {
    pageSize: Number(payload.pageSize) || PAGE_SIZE,
    total: Number(payload.total),
    items: payload.items as PropertyFeedItem[],
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const requestUrl = new URL(request.url);
    const configuredSiteUrl = process.env.VITE_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
    const siteUrl = configuredSiteUrl || requestUrl.origin;
    const projectUrl = process.env.SUPABASE_URL?.trim()
      || process.env.VITE_SUPABASE_PROJECT_URL?.trim()
      || "https://rcrulfdobtmfxzpuyryn.supabase.co";
    const anonKey = process.env.SUPABASE_ANON_KEY?.trim()
      || process.env.VITE_SUPABASE_ANON_KEY?.trim();

    if (!anonKey) {
      return new Response("Property feed is not configured.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    try {
      const firstPage = await fetchPage(projectUrl, anonKey, 1);
      const pageCount = Math.ceil(firstPage.total / firstPage.pageSize);
      if (pageCount > MAX_PAGES) throw new Error("Property inventory exceeds the feed pagination limit.");

      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
          fetchPage(projectUrl, anonKey, index + 2),
        ),
      );
      const properties = [firstPage, ...remainingPages]
        .flatMap(page => page.items)
        .filter((property, index, all) => all.findIndex(item => item.id === property.id) === index)
        .filter(property => property.transaction === "vente" || property.transaction === undefined)
        .filter(property => availableStatuses.has(property.adminStatusOverride ?? property.status ?? ""))
        .filter(property => Number.isInteger(property.id) && property.id > 0 && property.title.trim());

      const items = properties.map(property => rssItem(property, siteUrl)).join("\n");
      const selfUrl = `${siteUrl}/feeds/properties-for-sale.xml`;
      const feed = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">',
        "  <channel>",
        "    <title>Foch Immobilier · Biens à vendre</title>",
        `    <link>${xmlEscape(siteUrl)}/biens</link>`,
        "    <description>Tous les biens actuellement disponibles à la vente chez Foch Immobilier, au Havre et dans les environs.</description>",
        "    <language>fr-FR</language>",
        `    <atom:link href="${xmlEscape(selfUrl)}" rel="self" type="application/rss+xml" />`,
        `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
        "    <ttl>5</ttl>",
        items,
        "  </channel>",
        "</rss>",
        "",
      ].join("\n");

      return xmlResponse(request.method === "HEAD" ? "" : feed);
    } catch (error) {
      console.error("Property RSS feed could not be generated.", error instanceof Error ? error.message : "Unknown error");
      return new Response("Property feed is temporarily unavailable.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  },
};
