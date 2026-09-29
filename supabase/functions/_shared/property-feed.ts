export type ImportedPropertyStatus = "active" | "under_offer" | "sold" | "rented" | "off_market";

export interface ProviderPropertyFeed {
  schemaVersion: 1;
  generatedAt?: string;
  properties: Array<Record<string, unknown> & { id: number; cityId: string; status: ImportedPropertyStatus }>;
  cities: Array<Record<string, unknown> & { id: string; name: string; slug: string }>;
  agents: Array<Record<string, unknown> & { id: string; fullName: string }>;
}

const allowedStatuses = new Set<ImportedPropertyStatus>(["active", "under_offer", "sold", "rented", "off_market"]);
const allowedTransactions = new Set(["vente", "location"]);
const allowedTypes = new Set(["appartement", "maison_villa", "autre"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Each ${label} must be a non-empty string.`);
  }
  return value.trim();
}

function requiredId(value: unknown, label: string): number {
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Each ${label} must be a positive integer.`);
  }
  return id;
}

export function validatePropertyFeed(value: unknown): ProviderPropertyFeed {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error("Unsupported property feed format. Expected schemaVersion 1.");
  }

  if (!Array.isArray(value.properties) || value.properties.length === 0 || value.properties.length > 250) {
    throw new Error("The feed must contain between 1 and 250 properties.");
  }
  if (!Array.isArray(value.cities) || value.cities.length === 0 || value.cities.length > 100) {
    throw new Error("The feed must contain between 1 and 100 cities.");
  }
  if (!Array.isArray(value.agents) || value.agents.length > 100) {
    throw new Error("The feed must include an agents array with at most 100 entries.");
  }

  const cityIds = new Set<string>();
  const citySlugs = new Set<string>();
  for (const item of value.cities) {
    if (!isRecord(item)) throw new Error("Each city entry must be an object.");
    const id = requiredText(item.id, "city id");
    const slug = requiredText(item.slug, "city slug");
    requiredText(item.name, "city name");
    if (cityIds.has(id) || citySlugs.has(slug)) throw new Error("City ids and slugs must be unique in a feed.");
    cityIds.add(id);
    citySlugs.add(slug);
  }

  const agentIds = new Set<string>();
  for (const item of value.agents) {
    if (!isRecord(item)) throw new Error("Each agent entry must be an object.");
    const id = requiredText(item.id, "agent id");
    requiredText(item.fullName, "agent full name");
    if (agentIds.has(id)) throw new Error("Agent ids must be unique in a feed.");
    agentIds.add(id);
  }

  const propertyIds = new Set<number>();
  const properties = value.properties.map((item) => {
    if (!isRecord(item)) throw new Error("Each property entry must be an object.");
    const id = requiredId(item.id, "property reference");
    const cityId = requiredText(item.cityId, "property city id");
    if (!cityIds.has(cityId)) throw new Error(`Property ${id} references a city missing from the feed.`);
    if (propertyIds.has(id)) throw new Error("Property references must be unique in a feed.");
    propertyIds.add(id);

    requiredText(item.title, `property ${id} title`);
    requiredText(item.slug, `property ${id} slug`);
    if (!allowedTransactions.has(String(item.transactionType))) throw new Error(`Property ${id} has an unsupported transaction type.`);
    if (!allowedTypes.has(String(item.propertyType))) throw new Error(`Property ${id} has an unsupported property type.`);
    if (!allowedStatuses.has(String(item.status) as ImportedPropertyStatus)) throw new Error(`Property ${id} has an unsupported status.`);
    if (!Number.isFinite(Number(item.priceAmount)) || Number(item.priceAmount) < 0) throw new Error(`Property ${id} has an invalid price.`);
    if (item.agentId != null && item.agentId !== "" && !agentIds.has(String(item.agentId))) {
      throw new Error(`Property ${id} references an agent missing from the feed.`);
    }
    if (item.images != null && !Array.isArray(item.images)) throw new Error(`Property ${id} images must be an array.`);
    if (item.features != null && !Array.isArray(item.features)) throw new Error(`Property ${id} features must be an array.`);
    return { ...item, id, cityId, status: item.status as ImportedPropertyStatus };
  });

  return {
    schemaVersion: 1,
    ...(typeof value.generatedAt === "string" ? { generatedAt: value.generatedAt } : {}),
    properties,
    cities: value.cities as ProviderPropertyFeed["cities"],
    agents: value.agents as ProviderPropertyFeed["agents"],
  };
}
