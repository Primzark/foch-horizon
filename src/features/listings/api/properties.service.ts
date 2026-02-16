import { cityById, cityBySlug } from "@/features/cities/data/cities";
import { properties, propertyById, propertyBySlug } from "@/features/listings/data/properties";
import { normalizeKeyword } from "@/features/listings/utils/formatting";
import { apiJson, isEdgeApiEnabled } from "@/lib/api/client";
import type { PropertySearchParams, PropertySearchResponse } from "@/types/api";
import type { Property } from "@/types/domain";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const apiDelay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

function applyFilters(items: Property[], params: PropertySearchParams): Property[] {
  let result = items.filter((property) => property.status !== "off_market");

  if (params.transaction) {
    result = result.filter((property) => property.transactionType === params.transaction);
  }

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

  if (params.terrainMin != null) {
    result = result.filter((property) => (property.terrainM2 ?? 0) >= params.terrainMin!);
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
  if (isEdgeApiEnabled()) {
    const query = new URLSearchParams();
    if (params.transaction) query.set("transaction", params.transaction);
    if (params.type) query.set("type", params.type);
    if (params.city) query.set("city", params.city);
    if (params.q) query.set("q", params.q);
    if (params.bedroomsMin != null) query.set("bedroomsMin", String(params.bedroomsMin));
    if (params.bathroomsMin != null) query.set("bathroomsMin", String(params.bathroomsMin));
    if (params.garagesMin != null) query.set("garagesMin", String(params.garagesMin));
    if (params.priceMin != null) query.set("priceMin", String(params.priceMin));
    if (params.priceMax != null) query.set("priceMax", String(params.priceMax));
    if (params.surfaceMin != null) query.set("surfaceMin", String(params.surfaceMin));
    if (params.terrainMin != null) query.set("terrainMin", String(params.terrainMin));
    if (params.features) params.features.forEach((feature) => query.append("features", feature));
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    if (params.sort) query.set("sort", params.sort);

    return apiJson<PropertySearchResponse>(`/api/properties?${query.toString()}`);
  }

  await apiDelay();

  const page = params.page && params.page > 0 ? params.page : DEFAULT_PAGE;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : DEFAULT_PAGE_SIZE;

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
      return await apiJson<Property>(`/api/properties/${id}`);
    } catch {
      return null;
    }
  }

  await apiDelay();
  return propertyById.get(id) ?? null;
}

export async function getPropertyBySlug(slug: string): Promise<Property | null> {
  if (isEdgeApiEnabled()) {
    return null;
  }

  await apiDelay();
  return propertyBySlug.get(slug) ?? null;
}

export async function getPropertyByCanonicalPathId(idParam: string): Promise<Property | null> {
  await apiDelay();
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return null;
  }

  return propertyById.get(id) ?? null;
}

export async function getSimilarProperties(property: Property, limit = 3): Promise<Property[]> {
  await apiDelay();

  const sameCity = properties.filter(
    (item) =>
      item.id !== property.id &&
      item.cityId === property.cityId &&
      item.transactionType === property.transactionType &&
      item.status === "active",
  );

  if (sameCity.length >= limit) {
    return sameCity.slice(0, limit);
  }

  const sameTransaction = properties.filter(
    (item) =>
      item.id !== property.id &&
      item.transactionType === property.transactionType &&
      item.status === "active" &&
      !sameCity.some((candidate) => candidate.id === item.id),
  );

  return [...sameCity, ...sameTransaction].slice(0, limit);
}

export async function getFeaturedProperties(limit = 8): Promise<Property[]> {
  await apiDelay();
  return properties.filter((property) => property.isFeatured && property.status === "active").slice(0, limit);
}

export async function getPropertiesByCitySlug(citySlug: string): Promise<Property[]> {
  if (isEdgeApiEnabled()) {
    const result = await searchProperties({
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

  return properties.filter((property) => property.cityId === city.id && property.status !== "off_market");
}

export async function resolveLegacySlugToProperty(slug: string): Promise<Property | null> {
  await apiDelay();
  return propertyBySlug.get(slug) ?? null;
}
