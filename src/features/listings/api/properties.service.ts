import { cityById, cityBySlug } from "@/features/cities/data/cities";
import { agents } from "@/features/listings/data/agents";
import { properties, propertyById, propertyBySlug } from "@/features/listings/data/properties";
import { normalizeKeyword } from "@/features/listings/utils/formatting";
import { apiJson, isEdgeApiEnabled } from "@/lib/api/client";
import type { PropertySearchParams, PropertySearchResponse } from "@/types/api";
import type { Property } from "@/types/domain";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const apiDelay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

type EdgePropertyDetailRow = {
  id: number;
  title: string;
  slug: string;
  transaction_type: Property["transactionType"];
  property_type: Property["propertyType"];
  status: Property["status"];
  source_status?: string | null;
  price_amount: number;
  price_currency: Property["priceCurrency"];
  surface_m2: number | null;
  terrain_m2: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_count: number | null;
  garage_count: number | null;
  dpe_label: Property["dpeLabel"];
  dpe_value: number | null;
  ges_label: Property["gesLabel"];
  ges_value: number | null;
  description: string | null;
  city_id: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  agent_id: string | null;
  published_at: string | null;
  updated_at: string;
  city?: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
  } | null;
  agent?: {
    id?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  images?: Array<{
    id?: string | null;
    property_id?: number | null;
    source_url?: string | null;
    sort_order?: number | null;
    alt_text?: string | null;
  }> | null;
  features?: Array<{
    property_id?: number | null;
    feature_key?: string | null;
    label_fr?: string | null;
  }> | null;
};

function normalizeAgentLookupKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const localAgentIdByName = new Map(
  agents.map((agent) => [normalizeAgentLookupKey(agent.fullName), agent.id] as const),
);

function mapEdgePropertyDetailToDomain(row: EdgePropertyDetailRow): Property {
  const citySlug = row.city?.slug ?? null;
  const localCity = citySlug ? cityBySlug.get(citySlug) : undefined;
  const cityId = localCity?.id ?? row.city_id ?? "city-le-havre";

  const localAgentId =
    localAgentIdByName.get(normalizeAgentLookupKey(row.agent?.full_name)) ??
    (row.agent_id ?? undefined) ??
    "agent-jeanne-morel";

  const images = (row.images ?? [])
    .filter((image) => typeof image?.source_url === "string" && image.source_url.trim().length > 0)
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
    .map((image, index) => ({
      id: image.id ?? `${row.id}-${index + 1}`,
      propertyId: row.id,
      sourceUrl: image.source_url!.trim(),
      sortOrder: image.sort_order ?? index,
      altText: image.alt_text ?? `${row.title} - photo ${index + 1}`,
    }));

  const features = (row.features ?? [])
    .filter((feature) => typeof feature?.feature_key === "string" && typeof feature?.label_fr === "string")
    .map((feature) => ({
      propertyId: row.id,
      featureKey: feature.feature_key!.trim(),
      labelFr: feature.label_fr!.trim(),
    }));

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    transactionType: row.transaction_type,
    propertyType: row.property_type,
    status: row.status,
    sourceStatus: row.source_status ?? null,
    priceAmount: row.price_amount,
    priceCurrency: row.price_currency ?? "EUR",
    surfaceM2: row.surface_m2 ?? 0,
    terrainM2: row.terrain_m2 ?? null,
    rooms: row.rooms ?? null,
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms ?? null,
    parkingCount: row.parking_count ?? null,
    garageCount: row.garage_count ?? null,
    dpeLabel: row.dpe_label ?? null,
    dpeValue: row.dpe_value ?? null,
    gesLabel: row.ges_label ?? null,
    gesValue: row.ges_value ?? null,
    description: row.description ?? "",
    cityId,
    postalCode: row.postal_code ?? "",
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    agentId: localAgentId,
    publishedAt: row.published_at ?? row.updated_at,
    updatedAt: row.updated_at,
    isFeatured: false,
    images,
    features,
  };
}

export interface MarketCountersSnapshot {
  soldCount: number;
  underOfferCount: number;
  underContractCount: number;
  updatedAt: string;
  source?: "automatic" | "manual";
}

export interface UpdateMarketCountersInput {
  soldCount: number;
  underOfferCount: number;
  underContractCount: number;
}

function readCounterEnv(name: string): number | null {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed);
}

function applyFilters(items: Property[], params: PropertySearchParams): Property[] {
  let result = items.filter((property) => property.transactionType === "vente" && property.status !== "off_market");

  if (params.transaction && params.transaction !== "vente") return [];

  if (params.type) {
    result = result.filter((property) => property.propertyType === params.type);
  }

  if (params.city) {
    const cityNeedle = normalizeKeyword(params.city);
    result = result.filter((property) => {
      const city = cityById.get(property.cityId);
      if (!city) {
        return false;
      }

      return (
        normalizeKeyword(city.slug) === cityNeedle ||
        normalizeKeyword(city.name).includes(cityNeedle) ||
        normalizeKeyword(property.postalCode).includes(cityNeedle)
      );
    });
  }

  if (params.q) {
    const keyword = normalizeKeyword(params.q);
    result = result.filter((property) => {
      const city = cityById.get(property.cityId);
      const reference = String(property.id);
      return (
        normalizeKeyword(property.title).includes(keyword) ||
        normalizeKeyword(property.description).includes(keyword) ||
        normalizeKeyword(property.slug).includes(keyword) ||
        normalizeKeyword(city?.name ?? "").includes(keyword) ||
        normalizeKeyword(reference).includes(keyword)
      );
    });
  }

  if (params.bedroomsMin != null) {
    result = result.filter((property) => (property.bedrooms ?? 0) >= params.bedroomsMin!);
  }

  if (params.bathroomsMin != null) {
    result = result.filter((property) => (property.bathrooms ?? 0) >= params.bathroomsMin!);
  }

  if (params.garagesMin != null) {
    result = result.filter((property) => (property.garageCount ?? 0) >= params.garagesMin!);
  }

  if (params.priceMin != null) {
    result = result.filter((property) => property.priceAmount >= params.priceMin!);
  }

  if (params.priceMax != null) {
    result = result.filter((property) => property.priceAmount <= params.priceMax!);
  }

  if (params.surfaceMin != null) {
    result = result.filter((property) => property.surfaceM2 >= params.surfaceMin!);
  }

  if (params.surfaceMax != null) {
    result = result.filter((property) => property.surfaceM2 <= params.surfaceMax!);
  }

  if (params.terrainMin != null) {
    result = result.filter((property) => (property.terrainM2 ?? 0) >= params.terrainMin!);
  }

  if (params.terrainMax != null) {
    result = result.filter((property) => (property.terrainM2 ?? 0) <= params.terrainMax!);
  }

  if (params.features && params.features.length > 0) {
    const wantedFeatures = params.features.map((feature) => normalizeKeyword(feature));
    result = result.filter((property) => {
      const featureValues = property.features.map((feature) => normalizeKeyword(feature.featureKey));
      return wantedFeatures.every((feature) => featureValues.some((value) => value.includes(feature)));
    });
  }

  return result;
}

function applySort(items: Property[], sort: PropertySearchParams["sort"]): Property[] {
  const result = [...items];

  switch (sort) {
    case "price_asc":
      result.sort((a, b) => a.priceAmount - b.priceAmount);
      break;
    case "price_desc":
      result.sort((a, b) => b.priceAmount - a.priceAmount);
      break;
    case "surface_desc":
      result.sort((a, b) => b.surfaceM2 - a.surfaceM2);
      break;
    case "newest":
    default:
      result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      break;
  }

  return result;
}

export async function searchProperties(params: PropertySearchParams): Promise<PropertySearchResponse> {
  const page = params.page && params.page > 0 ? params.page : DEFAULT_PAGE;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : DEFAULT_PAGE_SIZE;

  if (params.transaction && params.transaction !== "vente") {
    return { page, pageSize, total: 0, items: [] };
  }

  if (isEdgeApiEnabled()) {
    const query = new URLSearchParams();
    query.set("transaction", "vente");
    if (params.type) query.set("type", params.type);
    if (params.city) query.set("city", params.city);
    if (params.q) query.set("q", params.q);
    if (params.bedroomsMin != null) query.set("bedroomsMin", String(params.bedroomsMin));
    if (params.bathroomsMin != null) query.set("bathroomsMin", String(params.bathroomsMin));
    if (params.garagesMin != null) query.set("garagesMin", String(params.garagesMin));
    if (params.priceMin != null) query.set("priceMin", String(params.priceMin));
    if (params.priceMax != null) query.set("priceMax", String(params.priceMax));
    if (params.surfaceMin != null) query.set("surfaceMin", String(params.surfaceMin));
    if (params.surfaceMax != null) query.set("surfaceMax", String(params.surfaceMax));
    if (params.terrainMin != null) query.set("terrainMin", String(params.terrainMin));
    if (params.terrainMax != null) query.set("terrainMax", String(params.terrainMax));
    if (params.features) params.features.forEach((feature) => query.append("features", feature));
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    if (params.sort) query.set("sort", params.sort);

    return apiJson<PropertySearchResponse>(`/api/properties?${query.toString()}`);
  }

  await apiDelay();

  const filtered = applySort(applyFilters(properties, params), params.sort);
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginated = filtered.slice(start, end);

  return {
    page,
    pageSize,
    total,
    items: paginated.map((property) => {
      const city = cityById.get(property.cityId);
      return {
        id: property.id,
        title: property.title,
        slug: property.slug,
        transaction: property.transactionType,
        type: property.propertyType,
        priceAmount: property.priceAmount,
        currency: property.priceCurrency,
        surfaceM2: property.surfaceM2,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        parking: property.parkingCount,
        garage: property.garageCount,
        city: {
          name: city?.name ?? "",
          slug: city?.slug ?? "",
          postalCode: property.postalCode,
        },
        coverImageUrl: property.images[0]?.sourceUrl ?? "",
        dpeLabel: property.dpeLabel,
        status: property.status,
      };
    }),
  };
}

export async function getPropertyById(id: number): Promise<Property | null> {
  if (isEdgeApiEnabled()) {
    try {
      const payload = await apiJson<EdgePropertyDetailRow>(`/api/properties/${id}`);
      const property = mapEdgePropertyDetailToDomain(payload);
      return property.transactionType === "vente" ? property : null;
    } catch {
      return null;
    }
  }

  await apiDelay();
  const property = propertyById.get(id);
  return property?.transactionType === "vente" ? property : null;
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  if (isEdgeApiEnabled()) {
    return null;
  }

  await apiDelay();
  const property = propertyBySlug.get(slug);
  return property?.transactionType === "vente" ? property : null;
}

export async function getPropertyByCanonicalPathId(idParam: string): Promise<Property | null> {
  await apiDelay();
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return null;
  }

  const property = propertyById.get(id);
  return property?.transactionType === "vente" ? property : null;
}

export interface SimilarPropertyRecommendation {
  property: Property;
  reason: string;
}

export async function getSimilarProperties(property: Property, limit = 3): Promise<SimilarPropertyRecommendation[]> {
  if (property.transactionType !== "vente" || limit <= 0) return [];
  await apiDelay();

  const referencePrice = property.priceAmount;
  const referenceSurface = property.surfaceM2;
  const recommendations = properties
    .filter(
      (candidate) =>
        candidate.id !== property.id &&
        candidate.transactionType === "vente" &&
        candidate.status === "active" &&
        candidate.cityId === property.cityId &&
        candidate.propertyType === property.propertyType &&
        candidate.surfaceM2 > 0 &&
        candidate.images.some((image) => image.sourceUrl.trim().length > 0),
    )
    .map((candidate) => {
      const priceDifference = referencePrice > 0 ? Math.abs(candidate.priceAmount - referencePrice) / referencePrice : 1;
      const surfaceDifference = referenceSurface > 0 ? Math.abs(candidate.surfaceM2 - referenceSurface) / referenceSurface : 1;
      const roomDifference = property.rooms != null && candidate.rooms != null
        ? Math.abs(candidate.rooms - property.rooms)
        : null;
      const samePostalCode = Boolean(property.postalCode && candidate.postalCode === property.postalCode);
      const similarPrice = priceDifference <= 0.2;
      const similarRooms = roomDifference != null && roomDifference <= 1;
      const similarSurface = surfaceDifference <= 0.2;
      const comparablePrice = priceDifference <= 0.35;
      const comparableSurface = surfaceDifference <= 0.35;
      const comparableSectorAndBudget = samePostalCode && comparablePrice;
      const hasUsefulMatch = similarPrice || similarSurface || (similarRooms && (comparablePrice || comparableSurface)) || comparableSectorAndBudget;

      const score =
        40 +
        (samePostalCode ? 15 : 0) +
        (similarPrice ? 24 : comparablePrice ? 14 : priceDifference <= 0.5 ? 5 : -10) +
        (roomDifference === 0 ? 14 : similarRooms ? 10 : roomDifference != null && roomDifference <= 2 ? 4 : 0) +
        (similarSurface ? 18 : comparableSurface ? 10 : -5);

      const reason = similarPrice
        ? "Budget similaire"
        : roomDifference === 0
          ? "Même nombre de pièces"
          : similarRooms
            ? "Pièces proches"
            : similarSurface
              ? "Surface comparable"
              : comparableSectorAndBudget
                ? "Même secteur"
                : null;

      return { property: candidate, score, reason, hasUsefulMatch, priceDifference, surfaceDifference, roomDifference };
    })
    .filter((candidate) => candidate.hasUsefulMatch && candidate.reason != null)
    .sort((left, right) =>
      right.score - left.score ||
      left.priceDifference - right.priceDifference ||
      left.surfaceDifference - right.surfaceDifference ||
      (left.roomDifference ?? Number.POSITIVE_INFINITY) - (right.roomDifference ?? Number.POSITIVE_INFINITY) ||
      left.property.id - right.property.id,
    )
    .slice(0, limit);

  return recommendations.map(({ property: candidate, reason }) => ({
    property: candidate,
    reason: reason!,
  }));
}

export async function getFeaturedProperties(limit = 8): Promise<Property[]> {
  await apiDelay();
  const activeProperties = properties.filter((property) => property.status === "active" && property.transactionType === "vente");
  const featured = activeProperties.filter((property) => property.isFeatured);

  if (featured.length >= limit) {
    return featured.slice(0, limit);
  }

  const featuredIds = new Set(featured.map((property) => property.id));
  const newestRemaining = [...activeProperties]
    .filter((property) => !featuredIds.has(property.id))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return [...featured, ...newestRemaining].slice(0, limit);
}

export async function getPropertiesByCitySlug(citySlug: string): Promise<Property[]> {
  if (isEdgeApiEnabled()) {
    const result = await searchProperties({
      transaction: "vente",
      city: citySlug,
      page: 1,
      pageSize: 48,
      sort: "newest",
    });

    // City hub in edge mode currently consumes listing cards.
    return result.items.map((item) => {
      const city = cityBySlug.get(item.city.slug);
      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        transactionType: item.transaction,
        propertyType: item.type,
        status: item.status,
        priceAmount: item.priceAmount,
        priceCurrency: item.currency,
        surfaceM2: item.surfaceM2,
        terrainM2: null,
        rooms: null,
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        parkingCount: item.parking,
        garageCount: item.garage,
        dpeLabel: item.dpeLabel,
        dpeValue: null,
        gesLabel: null,
        gesValue: null,
        description: "",
        cityId: city?.id ?? "",
        postalCode: item.city.postalCode,
        lat: null,
        lng: null,
        agentId: "",
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isFeatured: false,
        images: [
          {
            id: `${item.id}-cover`,
            propertyId: item.id,
            sourceUrl: item.coverImageUrl,
            sortOrder: 0,
            altText: item.title,
          },
        ],
        features: [],
      };
    });
  }

  await apiDelay();
  const city = cityBySlug.get(citySlug);
  if (!city) {
    return [];
  }

  return properties.filter(
    (property) => property.cityId === city.id && property.transactionType === "vente" && property.status !== "off_market",
  );
}

export async function resolveLegacySlugToProperty(slug: string): Promise<Property | null> {
  if (isEdgeApiEnabled()) {
    try {
      const query = new URLSearchParams({
        slug,
        transaction: "vente",
        page: "1",
        pageSize: "1",
      });
      const result = await apiJson<PropertySearchResponse>(`/api/properties?${query.toString()}`);
      const item = result.items[0];
      if (!item) {
        return null;
      }

      return await getPropertyById(item.id);
    } catch {
      return null;
    }
  }

  await apiDelay();
  const property = propertyBySlug.get(slug);
  return property?.transactionType === "vente" ? property : null;
}

export async function getMarketCountersSnapshot(): Promise<MarketCountersSnapshot> {
  if (isEdgeApiEnabled()) {
    try {
      return await apiJson<MarketCountersSnapshot>("/api/properties/stats");
    } catch {
      // Continue to local fallback.
    }
  }

  await apiDelay();

  const soldInData = properties.filter((property) => property.status === "sold" && property.transactionType === "vente").length;
  const underOfferInData = properties.filter((property) => property.status === "under_offer").length;
  const activeCount = properties.filter((property) => property.status === "active").length;

  const soldCount = readCounterEnv("VITE_MARKET_SOLD_COUNT") ?? Math.max(soldInData, activeCount * 6);
  const underOfferCount =
    readCounterEnv("VITE_MARKET_UNDER_OFFER_COUNT") ?? Math.max(underOfferInData, Math.round(activeCount * 0.24));
  const underContractCount =
    readCounterEnv("VITE_MARKET_UNDER_CONTRACT_COUNT") ??
    Math.max(Math.min(underOfferCount, Math.round(underOfferCount * 0.75)), 6);

  return {
    soldCount,
    underOfferCount,
    underContractCount,
    updatedAt: new Date().toISOString(),
  };
}

export async function updateMarketCountersSnapshot(
  input: UpdateMarketCountersInput,
  accessToken: string,
): Promise<MarketCountersSnapshot> {
  if (!isEdgeApiEnabled()) {
    throw new Error("Edge API mode is disabled.");
  }

  const bearerToken = accessToken.trim();
  if (!bearerToken) {
    throw new Error("Missing access token.");
  }

  return await apiJson<MarketCountersSnapshot>("/api/properties/stats", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(input),
  });
}
