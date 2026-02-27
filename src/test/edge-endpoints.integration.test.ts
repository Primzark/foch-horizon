import { describe, expect, it } from "vitest";

interface PropertySearchResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    id: number;
    title: string;
  }>;
}

interface PropertyAggregateResponse {
  ok: boolean;
  scope: "current_filtered" | "global_active_inventory" | "selected_properties";
  metrics: {
    count: number;
    avgSurfaceM2: number | null;
    medianSurfaceM2: number | null;
    minSurfaceM2: number | null;
    maxSurfaceM2: number | null;
    avgPrice: number | null;
    medianPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    avgPricePerM2: number | null;
  };
  breakdowns: {
    byTransaction: Array<{ key: string; label: string; count: number }>;
    byType: Array<{ key: string; label: string; count: number }>;
    topCities: Array<{ key: string; label: string; count: number }>;
  };
}

const runEdgeIntegration = process.env.RUN_EDGE_INTEGRATION === "true";
const runEdgeWriteTests = process.env.RUN_EDGE_WRITE_TESTS === "true";

const baseUrl = (process.env.EDGE_API_BASE_URL ?? process.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const citiesUrl = process.env.EDGE_CITIES_URL ?? (baseUrl ? `${baseUrl}/api/cities` : "");
const propertiesUrl = process.env.EDGE_PROPERTIES_URL ?? (baseUrl ? `${baseUrl}/api/properties` : "");
const propertiesAggregateUrl = process.env.EDGE_PROPERTIES_AGGREGATE_URL ?? (baseUrl ? `${baseUrl}/api/properties/aggregate` : "");
const propertyDetailBaseUrl =
  process.env.EDGE_PROPERTY_DETAIL_BASE_URL ?? (baseUrl ? `${baseUrl}/api/properties` : "");
const leadsUrl = process.env.EDGE_LEADS_URL ?? (baseUrl ? `${baseUrl}/api/leads` : "");
const edgeApiKey = process.env.EDGE_ANON_KEY;

const edgeHeaders: HeadersInit = {
  "Content-Type": "application/json",
  ...(edgeApiKey
    ? {
        apikey: edgeApiKey,
        Authorization: `Bearer ${edgeApiKey}`,
      }
    : {}),
};

const describeEdge =
  runEdgeIntegration && citiesUrl && propertiesUrl && propertyDetailBaseUrl ? describe : describe.skip;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: edgeHeaders,
  });

  expect(response.ok).toBe(true);
  return (await response.json()) as T;
}

describeEdge("Supabase Edge endpoint contracts", () => {
  it(
    "returns active cities",
    async () => {
      const cities = await getJson<Array<{ id: string; name: string; slug: string }>>(citiesUrl);

      expect(Array.isArray(cities)).toBe(true);
      expect(cities.length).toBeGreaterThan(0);
      expect(cities[0]).toHaveProperty("slug");
    },
    15000,
  );

  it("returns paginated properties", async () => {
    const data = await getJson<PropertySearchResponse>(`${propertiesUrl}?page=1&pageSize=3`);

    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0]).toHaveProperty("id");
  });

  it("returns a property detail payload", async () => {
    const list = await getJson<PropertySearchResponse>(`${propertiesUrl}?page=1&pageSize=1`);
    const propertyId = list.items[0]?.id;

    expect(propertyId).toBeTruthy();

    const detail = await getJson<{ id: number; title: string }>(`${propertyDetailBaseUrl}/${propertyId}`);

    expect(detail.id).toBe(propertyId);
    expect(detail.title).toBeTruthy();
  });

  it("supports advanced surface/terrain max filters on listings endpoint", async () => {
    const broad = await getJson<PropertySearchResponse>(`${propertiesUrl}?page=1&pageSize=24&transaction=vente`);
    const narrowedSurface = await getJson<PropertySearchResponse>(
      `${propertiesUrl}?page=1&pageSize=24&transaction=vente&surfaceMin=40&surfaceMax=120`,
    );
    const narrowedTerrain = await getJson<PropertySearchResponse>(
      `${propertiesUrl}?page=1&pageSize=24&transaction=vente&terrainMin=100&terrainMax=1000`,
    );

    expect(narrowedSurface.total).toBeLessThanOrEqual(broad.total);
    expect(narrowedTerrain.total).toBeLessThanOrEqual(broad.total);
  });

  it("returns aggregate metrics for current_filtered and global scopes", async () => {
    expect(propertiesAggregateUrl).toBeTruthy();

    const filtered = await getJson<PropertyAggregateResponse>(
      `${propertiesAggregateUrl}?scope=current_filtered&transaction=vente&type=appartement&city=Le%20Havre&priceMin=200000&priceMax=350000`,
    );
    const global = await getJson<PropertyAggregateResponse>(
      `${propertiesAggregateUrl}?scope=global_active_inventory`,
    );

    expect(filtered.ok).toBe(true);
    expect(filtered.scope).toBe("current_filtered");
    expect(filtered.metrics.count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(filtered.breakdowns.byType)).toBe(true);
    expect(Array.isArray(filtered.breakdowns.byTransaction)).toBe(true);
    expect(Array.isArray(filtered.breakdowns.topCities)).toBe(true);

    expect(global.ok).toBe(true);
    expect(global.scope).toBe("global_active_inventory");
    expect(global.metrics.count).toBeGreaterThanOrEqual(0);
  });

  it("returns zero-count aggregate metrics for impossible filters", async () => {
    expect(propertiesAggregateUrl).toBeTruthy();

    const empty = await getJson<PropertyAggregateResponse>(
      `${propertiesAggregateUrl}?scope=current_filtered&city=Le%20Havre&priceMin=999999999&priceMax=1000000000&surfaceMin=10000`,
    );

    expect(empty.ok).toBe(true);
    expect(empty.metrics.count).toBe(0);
  });

  const itWrite = runEdgeWriteTests ? it : it.skip;

  itWrite("accepts a lead payload", async () => {
    expect(leadsUrl).toBeTruthy();

    const payload = {
      source: "contact_page",
      firstName: "Integration",
      lastName: "Test",
      email: `integration+${Date.now()}@example.com`,
      phone: "+33123456789",
      message: "Test de validation du endpoint /api/leads via vitest.",
      consent: true,
    };

    const response = await fetch(leadsUrl, {
      method: "POST",
      headers: edgeHeaders,
      body: JSON.stringify(payload),
    });

    expect(response.ok).toBe(true);

    const body = (await response.json()) as { ok: boolean; leadId: string };
    expect(body.ok).toBe(true);
    expect(body.leadId).toBeTruthy();
  });

  itWrite(
    "accepts a city lead payload with slug cityId",
    async () => {
      expect(leadsUrl).toBeTruthy();

      const cities = await getJson<Array<{ slug: string }>>(citiesUrl);
      const citySlug = cities.find((city) => typeof city.slug === "string" && city.slug.trim().length > 0)?.slug;
      expect(citySlug).toBeTruthy();

      const payload = {
        source: "contact_page",
        cityId: citySlug,
        firstName: "Integration",
        lastName: "CitySlug",
        email: `integration+city-${Date.now()}@example.com`,
        phone: "+33123456789",
        message: "Test de validation du endpoint /api/leads avec cityId slug.",
        consent: true,
      };

      const response = await fetch(leadsUrl, {
        method: "POST",
        headers: edgeHeaders,
        body: JSON.stringify(payload),
      });

      expect(response.ok).toBe(true);

      const body = (await response.json()) as { ok: boolean; leadId: string };
      expect(body.ok).toBe(true);
      expect(body.leadId).toBeTruthy();
    },
    20000,
  );
});
