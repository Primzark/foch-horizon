/**
 * Provider sync worker.
 *
 * Intended schedules:
 * - Incremental sync: hourly
 * - Full sync: nightly
 *
 * Supported inputs:
 * - Remote JSON feed (`PROVIDER_FEED_URL`)
 * - Local JSON file for dry-runs/testing (`PROVIDER_SYNC_INPUT_FILE`)
 *
 * The worker expects either:
 * - Already normalized properties, or
 * - Raw JSON objects with common camelCase/snake_case aliases
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

type SyncMode = "incremental" | "full";
type TransactionType = "vente" | "location";
type PropertyType = "appartement" | "maison_villa" | "autre";
type PropertyStatus = "active" | "under_offer" | "sold" | "rented" | "off_market";

interface ProviderFeatureInput {
  featureKey?: string;
  key?: string;
  code?: string;
  labelFr?: string;
  label?: string;
  value?: string;
}

interface ProviderImageInput {
  sourceUrl?: string;
  source_url?: string;
  url?: string;
  href?: string;
  sortOrder?: number;
  sort_order?: number;
  order?: number;
  altText?: string;
  alt_text?: string;
}

interface ProviderDocumentInput {
  sourceUrl?: string;
  source_url?: string;
  url?: string;
  href?: string;
  kind?: string;
  type?: string;
  mimeType?: string;
  mime_type?: string;
  label?: string;
  name?: string;
}

interface ProviderProperty {
  id: number;
  title: string;
  slug: string;
  transactionType: TransactionType;
  propertyType: PropertyType;
  status: PropertyStatus;
  priceAmount: number;
  surfaceM2: number;
  citySlug: string;
  cityName?: string;
  postalCode: string;
  description: string;
  terrainM2?: number | null;
  rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingCount?: number | null;
  garageCount?: number | null;
  dpeLabel?: string | null;
  dpeValue?: number | null;
  gesLabel?: string | null;
  gesValue?: number | null;
  lat?: number | null;
  lng?: number | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  agentId?: string | null;
  isFeatured?: boolean;
  imageUrls?: string[];
  images?: ProviderImageInput[];
  documents?: ProviderDocumentInput[];
  features?: Array<string | ProviderFeatureInput>;
}

interface CliOptions {
  mode: SyncMode;
  dryRun: boolean;
  limit?: number;
  reconcileMissing: boolean;
}

interface SyncSummary {
  mode: SyncMode;
  dryRun: boolean;
  fetchedCount: number;
  normalizedCount: number;
  uniqueCount: number;
  cityCount: number;
  propertyUpserts: number;
  imageRows: number;
  documentRows: number;
  featureRows: number;
  mediaAnalysisJobs: number;
  offMarketReconciled: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTruthy(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function parseBoolean(value: string | null | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return defaultValue;
}

function parseInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  if (typeof value === "string") {
    const cleaned = value.trim();
    if (!cleaned) return null;
    const parsed = Number.parseInt(cleaned, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/\s+/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeKey(value: string): string {
  return normalizeWhitespace(stripDiacritics(value).toLowerCase());
}

function slugify(value: string): string {
  const slug = normalizeKey(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "annonce";
}

function titleizeSlug(slug: string): string {
  if (!slug) return "Ville";
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toFeatureKey(value: string): string {
  return normalizeKey(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "feature";
}

function sanitizePostalCode(value: unknown): string {
  const raw = typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
  const match = raw.match(/\b\d{5}\b/);
  return match?.[0] ?? "";
}

function sanitizeEnergyLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const label = value.trim().toUpperCase();
  return /^[A-G]$/.test(label) ? label : null;
}

function toIsoString(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getAtPath(root: unknown, path: string): unknown {
  if (!path.trim()) return root;
  return path.split(".").reduce<unknown>((current, part) => {
    if (!isRecord(current)) return undefined;
    return current[part];
  }, root);
}

function pickFirst<T>(...values: Array<T | null | undefined>): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return normalizeWhitespace(value);
    }
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (parsed !== null) return parsed;
  }
  return undefined;
}

function pickInteger(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = parseInteger(value);
    if (parsed !== null) return parsed;
  }
  return undefined;
}

function readArrayCandidate(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function coerceTransactionType(value: unknown): TransactionType {
  const normalized = normalizeKey(typeof value === "string" ? value : "");
  if (normalized.includes("loca") || normalized.includes("loue")) return "location";
  return "vente";
}

function coercePropertyType(value: unknown): PropertyType {
  const normalized = normalizeKey(typeof value === "string" ? value : "");
  if (normalized.includes("appart")) return "appartement";
  if (normalized.includes("maison") || normalized.includes("villa")) return "maison_villa";
  return "autre";
}

function coerceStatus(value: unknown): PropertyStatus {
  const normalized = normalizeKey(typeof value === "string" ? value : "");
  if (normalized.includes("under_offer") || normalized.includes("sous offre")) return "under_offer";
  if (normalized.includes("vendu") || normalized === "sold") return "sold";
  if (normalized.includes("rented") || normalized.includes("loue") || normalized.includes("louee")) return "rented";
  if (normalized.includes("off_market") || normalized.includes("retire") || normalized.includes("archive")) return "off_market";
  return "active";
}

function extractCityInfo(row: JsonObject): { citySlug: string; cityName?: string; postalCode: string } {
  const cityNode = isRecord(row.city) ? row.city : null;
  const cityName = pickString(
    row.cityName,
    row.city_name,
    cityNode?.name,
    row.city,
    row.town,
    row.commune,
  );
  const citySlug = slugify(
    pickString(
      row.citySlug,
      row.city_slug,
      cityNode?.slug,
      cityName,
      "inconnu",
    ) ?? "inconnu",
  );

  const postalCode = sanitizePostalCode(
    pickFirst(
      row.postalCode,
      row.postal_code,
      cityNode?.postalCode,
      cityNode?.postal_code,
      row.zip,
      row.zipCode,
      row.zip_code,
    ),
  );

  return {
    citySlug,
    cityName,
    postalCode,
  };
}

function normalizeImages(row: JsonObject, title: string): ProviderImageInput[] {
  const rawImages = readArrayCandidate(pickFirst(row.images, row.media, row.photos, row.photo_urls));
  const imageUrls = readArrayCandidate(pickFirst(row.imageUrls, row.image_urls));

  const output: ProviderImageInput[] = [];

  if (rawImages) {
    for (const [index, image] of rawImages.entries()) {
      if (typeof image === "string") {
        if (!image.trim()) continue;
        output.push({
          sourceUrl: image.trim(),
          sortOrder: index,
          altText: `${title} - photo ${index + 1}`,
        });
        continue;
      }

      if (!isRecord(image)) continue;

      const sourceUrl = pickString(image.sourceUrl, image.source_url, image.url, image.href);
      if (!sourceUrl) continue;

      output.push({
        sourceUrl,
        sortOrder: pickInteger(image.sortOrder, image.sort_order, image.order, index) ?? index,
        altText: pickString(image.altText, image.alt_text) ?? `${title} - photo ${index + 1}`,
      });
    }
  }

  if (imageUrls) {
    for (const [index, image] of imageUrls.entries()) {
      if (typeof image !== "string" || !image.trim()) continue;
      output.push({
        sourceUrl: image.trim(),
        sortOrder: index,
        altText: `${title} - photo ${index + 1}`,
      });
    }
  }

  const deduped = new Map<string, ProviderImageInput>();
  for (const image of output) {
    const sourceUrl = pickString(image.sourceUrl, image.source_url, image.url, image.href);
    if (!sourceUrl) continue;
    if (!deduped.has(sourceUrl)) {
      deduped.set(sourceUrl, {
        sourceUrl,
        sortOrder: pickInteger(image.sortOrder, image.sort_order, image.order),
        altText: pickString(image.altText, image.alt_text),
      });
    }
  }

  return Array.from(deduped.values()).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function normalizeFeatures(row: JsonObject): Array<string | ProviderFeatureInput> {
  const raw = readArrayCandidate(pickFirst(row.features, row.amenities, row.characteristics, row.options));
  if (!raw) return [];

  const output: Array<string | ProviderFeatureInput> = [];
  for (const feature of raw) {
    if (typeof feature === "string") {
      const label = normalizeWhitespace(feature);
      if (label) output.push(label);
      continue;
    }
    if (!isRecord(feature)) continue;
    output.push({
      featureKey: pickString(feature.featureKey, feature.feature_key, feature.key, feature.code),
      labelFr: pickString(feature.labelFr, feature.label_fr, feature.label, feature.value),
    });
  }

  return output;
}

function normalizeDocuments(row: JsonObject): ProviderDocumentInput[] {
  const candidateArrays = [
    readArrayCandidate(pickFirst(row.documents, row.files, row.attachments, row.pdfs, row.brochures, row.plans)),
    readArrayCandidate(getAtPath(row, "documents.items")),
    readArrayCandidate(getAtPath(row, "attachments.items")),
  ].filter((value): value is unknown[] => Array.isArray(value));

  const output: ProviderDocumentInput[] = [];
  const seen = new Set<string>();

  for (const list of candidateArrays) {
    for (const item of list) {
      if (typeof item === "string") {
        const sourceUrl = pickString(item);
        if (!sourceUrl || seen.has(sourceUrl)) continue;
        seen.add(sourceUrl);
        output.push({ sourceUrl });
        continue;
      }
      if (!isRecord(item)) continue;
      const sourceUrl = pickString(item.sourceUrl, item.source_url, item.url, item.href);
      if (!sourceUrl || seen.has(sourceUrl)) continue;
      seen.add(sourceUrl);
      output.push({
        sourceUrl,
        kind: pickString(item.kind, item.type),
        mimeType: pickString(item.mimeType, item.mime_type, item.contentType, item.content_type),
        label: pickString(item.label, item.name, item.title),
      });
    }
  }

  return output;
}

function coerceProviderProperty(raw: unknown): ProviderProperty | null {
  if (!isRecord(raw)) return null;

  const id = pickInteger(raw.id, raw.propertyId, raw.property_id, raw.reference, raw.ref);
  if (!id || id <= 0) return null;

  const title = pickString(raw.title, raw.name, raw.label) ?? `Annonce ${id}`;
  const slug = slugify(pickString(raw.slug, raw.slug_fr, title, `${id}`) ?? `${id}`);

  const transactionType = coerceTransactionType(
    pickFirst(raw.transactionType, raw.transaction_type, raw.transaction, raw.offerType, raw.offer_type),
  );
  const propertyType = coercePropertyType(
    pickFirst(raw.propertyType, raw.property_type, raw.type, raw.typeBien, raw.type_bien),
  );
  const status = coerceStatus(pickFirst(raw.status, raw.state, raw.availability));

  const priceAmount = pickNumber(raw.priceAmount, raw.price_amount, raw.price, raw.amount) ?? 0;
  const surfaceM2 = pickNumber(raw.surfaceM2, raw.surface_m2, raw.surface, raw.surfaceHab, raw.surface_hab) ?? 0;
  const terrainM2 = pickNumber(raw.terrainM2, raw.terrain_m2, raw.landSurface, raw.land_surface);
  const rooms = pickInteger(raw.rooms, raw.roomCount, raw.room_count);
  const bedrooms = pickInteger(raw.bedrooms, raw.bedroomCount, raw.bedroom_count);
  const bathrooms = pickInteger(raw.bathrooms, raw.bathroomCount, raw.bathroom_count);
  const parkingCount = pickInteger(raw.parkingCount, raw.parking_count, raw.parking);
  const garageCount = pickInteger(raw.garageCount, raw.garage_count, raw.garages, raw.garage);

  const { citySlug, cityName, postalCode } = extractCityInfo(raw);
  const description = pickString(raw.description, raw.body, raw.summary, raw.excerpt) ?? title;

  const images = normalizeImages(raw, title);
  const features = normalizeFeatures(raw);
  const documents = normalizeDocuments(raw);

  return {
    id,
    title,
    slug,
    transactionType,
    propertyType,
    status,
    priceAmount: Math.max(0, Math.round(priceAmount)),
    surfaceM2: Math.max(0, surfaceM2),
    terrainM2: terrainM2 ?? null,
    rooms: rooms ?? null,
    bedrooms: bedrooms ?? null,
    bathrooms: bathrooms ?? null,
    parkingCount: parkingCount ?? null,
    garageCount: garageCount ?? null,
    citySlug,
    cityName,
    postalCode,
    description,
    dpeLabel: sanitizeEnergyLabel(pickFirst(raw.dpeLabel, raw.dpe_label, raw.dpe)),
    dpeValue: pickNumber(raw.dpeValue, raw.dpe_value) ?? null,
    gesLabel: sanitizeEnergyLabel(pickFirst(raw.gesLabel, raw.ges_label, raw.ges)),
    gesValue: pickNumber(raw.gesValue, raw.ges_value) ?? null,
    lat: pickNumber(raw.lat, raw.latitude) ?? null,
    lng: pickNumber(raw.lng, raw.longitude, raw.lon) ?? null,
    publishedAt: toIsoString(pickFirst(raw.publishedAt, raw.published_at, raw.createdAt, raw.created_at)),
    updatedAt: toIsoString(pickFirst(raw.updatedAt, raw.updated_at)),
    agentId: pickString(raw.agentId, raw.agent_id) ?? null,
    isFeatured: Boolean(pickFirst(raw.isFeatured, raw.is_featured) ?? false),
    images,
    imageUrls: images.map((image) => image.sourceUrl ?? "").filter(Boolean),
    documents,
    features,
  };
}

function ensureUniqueSlugs(items: ProviderProperty[]): ProviderProperty[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const count = seen.get(item.slug) ?? 0;
    seen.set(item.slug, count + 1);
    if (count === 0) return item;
    return { ...item, slug: `${item.slug}-${item.id}` };
  });
}

function uniqueById(items: ProviderProperty[]): ProviderProperty[] {
  const map = new Map<number, ProviderProperty>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function parseCliOptions(args: string[]): CliOptions {
  let mode: SyncMode = "incremental";
  let dryRun = parseBoolean(Deno.env.get("PROVIDER_SYNC_DRY_RUN"), false);
  let limit: number | undefined;
  let reconcileMissing = parseBoolean(
    Deno.env.get("PROVIDER_RECONCILE_MISSING_ON_INCREMENTAL"),
    false,
  );

  const remaining = [...args];
  if (remaining[0] === "incremental" || remaining[0] === "full") {
    mode = remaining.shift() as SyncMode;
  }

  for (const arg of remaining) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--reconcile-missing") reconcileMissing = true;
    else if (arg === "--no-reconcile-missing") reconcileMissing = false;
    else if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) limit = parsed;
    }
  }

  return {
    mode,
    dryRun,
    limit,
    reconcileMissing,
  };
}

function buildFeedUrl(mode: SyncMode): string {
  const baseUrl = Deno.env.get("PROVIDER_FEED_URL") ?? "";
  if (!baseUrl.trim()) {
    throw new Error("Missing PROVIDER_FEED_URL (or use PROVIDER_SYNC_INPUT_FILE for local testing)");
  }

  const url = new URL(baseUrl);

  if (mode === "incremental") {
    const queryParam = Deno.env.get("PROVIDER_INCREMENTAL_QUERY_PARAM") ?? "";
    if (queryParam.trim()) {
      const lookbackHours = Number.parseInt(Deno.env.get("PROVIDER_INCREMENTAL_LOOKBACK_HOURS") ?? "24", 10);
      const hours = Number.isFinite(lookbackHours) && lookbackHours > 0 ? lookbackHours : 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      url.searchParams.set(queryParam, since);
    }
  }

  return url.toString();
}

function buildFeedHeaders(): Headers {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("User-Agent", "FochProviderSync/1.0");

  const headersJson = Deno.env.get("PROVIDER_FEED_HEADERS_JSON");
  if (isTruthy(headersJson)) {
    const parsed = JSON.parse(headersJson!) as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) {
        headers.set(key, value);
      }
    }
  }

  const authHeader = Deno.env.get("PROVIDER_FEED_AUTH_HEADER");
  const authToken = Deno.env.get("PROVIDER_FEED_AUTH_TOKEN");
  if (isTruthy(authHeader) && isTruthy(authToken)) {
    headers.set(authHeader!, authToken!);
  }

  const basicUser = Deno.env.get("PROVIDER_FEED_BASIC_USER");
  const basicPass = Deno.env.get("PROVIDER_FEED_BASIC_PASSWORD");
  if (isTruthy(basicUser) || isTruthy(basicPass)) {
    headers.set("Authorization", `Basic ${btoa(`${basicUser ?? ""}:${basicPass ?? ""}`)}`);
  }

  return headers;
}

async function loadFeedPayload(mode: SyncMode): Promise<unknown> {
  const localFile = Deno.env.get("PROVIDER_SYNC_INPUT_FILE");
  if (isTruthy(localFile)) {
    const fileContents = await Deno.readTextFile(localFile!);
    return JSON.parse(fileContents);
  }

  const url = buildFeedUrl(mode);
  const method = (Deno.env.get("PROVIDER_FEED_METHOD") ?? "GET").toUpperCase();
  const bodyJson = Deno.env.get("PROVIDER_FEED_BODY_JSON");
  const body = method === "GET" || !isTruthy(bodyJson) ? undefined : bodyJson;

  const response = await fetch(url, {
    method,
    headers: buildFeedHeaders(),
    body,
  });

  if (!response.ok) {
    throw new Error(`Provider feed request failed (${response.status})`);
  }

  return await response.json();
}

function extractItemsFromPayload(payload: unknown): unknown[] {
  const explicitPath = Deno.env.get("PROVIDER_FEED_ITEMS_PATH");
  if (isTruthy(explicitPath)) {
    const value = getAtPath(payload, explicitPath!);
    if (!Array.isArray(value)) {
      throw new Error(`PROVIDER_FEED_ITEMS_PATH "${explicitPath}" did not resolve to an array`);
    }
    return value;
  }

  if (Array.isArray(payload)) return payload;

  const candidates = [
    "items",
    "properties",
    "listings",
    "results",
    "data.items",
    "data.properties",
    "data.results",
    "payload.items",
  ];

  for (const path of candidates) {
    const value = getAtPath(payload, path);
    if (Array.isArray(value)) return value;
  }

  if (isRecord(payload)) {
    for (const value of Object.values(payload)) {
      if (Array.isArray(value)) return value;
    }
  }

  throw new Error("Unable to resolve provider items array from feed payload");
}

async function fetchProviderProperties(mode: SyncMode): Promise<ProviderProperty[]> {
  const payload = await loadFeedPayload(mode);
  const rawItems = extractItemsFromPayload(payload);

  const normalized = rawItems
    .map((item) => coerceProviderProperty(item))
    .filter((item): item is ProviderProperty => item !== null);

  const unique = ensureUniqueSlugs(uniqueById(normalized));
  return unique;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return "Unexpected error";
}

async function queryExistingPropertyPublishedAt(
  supabase: ReturnType<typeof createClient>,
  ids: number[],
): Promise<Map<number, string | null>> {
  const result = new Map<number, string | null>();
  for (const batch of chunk(ids, 500)) {
    const { data, error } = await supabase
      .from("properties")
      .select("id,published_at")
      .in("id", batch);

    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: number; published_at: string | null }>) {
      result.set(row.id, row.published_at);
    }
  }
  return result;
}

async function upsertCities(
  supabase: ReturnType<typeof createClient>,
  properties: ProviderProperty[],
): Promise<Map<string, { id: string; slug: string }>> {
  const bySlug = new Map<string, { name: string; postalCodes: Set<string> }>();

  for (const property of properties) {
    const current = bySlug.get(property.citySlug) ?? {
      name: property.cityName?.trim() || titleizeSlug(property.citySlug),
      postalCodes: new Set<string>(),
    };

    if (property.cityName?.trim() && current.name === titleizeSlug(property.citySlug)) {
      current.name = property.cityName.trim();
    }

    if (property.postalCode) current.postalCodes.add(property.postalCode);
    bySlug.set(property.citySlug, current);
  }

  const rows = Array.from(bySlug.entries()).map(([slug, city]) => ({
    slug,
    name: city.name,
    postal_codes: Array.from(city.postalCodes).sort(),
    is_active: true,
    updated_at: new Date().toISOString(),
  }));

  for (const batch of chunk(rows, 200)) {
    const { error } = await supabase.from("cities").upsert(batch, { onConflict: "slug" });
    if (error) throw error;
  }

  const map = new Map<string, { id: string; slug: string }>();
  for (const batch of chunk(Array.from(bySlug.keys()), 500)) {
    const { data, error } = await supabase.from("cities").select("id,slug").in("slug", batch);
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: string; slug: string }>) {
      map.set(row.slug, row);
    }
  }

  return map;
}

function buildPropertyRows(
  properties: ProviderProperty[],
  cityIdBySlug: Map<string, { id: string; slug: string }>,
  existingPublishedAtById: Map<number, string | null>,
): Array<Record<string, unknown>> {
  const now = new Date().toISOString();
  return properties.map((property) => {
    const city = cityIdBySlug.get(property.citySlug);
    if (!city) {
      throw new Error(`Missing city id for slug "${property.citySlug}" (property ${property.id})`);
    }

    return {
      id: property.id,
      title: property.title,
      slug: property.slug,
      transaction_type: property.transactionType,
      property_type: property.propertyType,
      status: property.status,
      price_amount: Math.round(property.priceAmount),
      price_currency: "EUR",
      surface_m2: property.surfaceM2,
      terrain_m2: property.terrainM2 ?? null,
      rooms: property.rooms ?? null,
      bedrooms: property.bedrooms ?? null,
      bathrooms: property.bathrooms ?? null,
      parking_count: property.parkingCount ?? null,
      garage_count: property.garageCount ?? null,
      dpe_label: property.dpeLabel ?? null,
      dpe_value: property.dpeValue ?? null,
      ges_label: property.gesLabel ?? null,
      ges_value: property.gesValue ?? null,
      description: property.description,
      city_id: city.id,
      postal_code: property.postalCode || null,
      lat: property.lat ?? null,
      lng: property.lng ?? null,
      agent_id: property.agentId ?? null,
      published_at: property.publishedAt ?? existingPublishedAtById.get(property.id) ?? now,
      updated_at: property.updatedAt ?? now,
    };
  });
}

function buildImageRows(properties: ProviderProperty[]): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  for (const property of properties) {
    const normalizedImages = (property.images ?? [])
      .map((image, index) => {
        const sourceUrl = pickString(image.sourceUrl, image.source_url, image.url, image.href);
        if (!sourceUrl) return null;
        return {
          property_id: property.id,
          source_url: sourceUrl,
          sort_order: pickInteger(image.sortOrder, image.sort_order, image.order, index) ?? index,
          alt_text:
            pickString(image.altText, image.alt_text) ??
            `${property.title} - photo ${index + 1}`,
        };
      })
      .filter((row): row is Record<string, unknown> => row !== null);

    rows.push(...normalizedImages);
  }
  return rows;
}

function buildFeatureRows(properties: ProviderProperty[]): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];

  for (const property of properties) {
    const seenKeys = new Set<string>();
    for (const feature of property.features ?? []) {
      let labelFr: string | undefined;
      let featureKey: string | undefined;

      if (typeof feature === "string") {
        labelFr = normalizeWhitespace(feature);
        featureKey = toFeatureKey(labelFr);
      } else {
        featureKey = pickString(feature.featureKey, feature.key, feature.code);
        labelFr = pickString(feature.labelFr, feature.label, feature.value);
        if (!featureKey && labelFr) featureKey = toFeatureKey(labelFr);
        if (!labelFr && featureKey) labelFr = featureKey.replace(/_/g, " ");
      }

      if (!featureKey || !labelFr) continue;
      if (seenKeys.has(featureKey)) continue;
      seenKeys.add(featureKey);

      rows.push({
        property_id: property.id,
        feature_key: featureKey,
        label_fr: labelFr,
      });
    }
  }

  return rows;
}

function inferDocumentKind(input: ProviderDocumentInput): "dpe_pdf" | "diagnostic_pdf" | "floor_plan_pdf" | "brochure_pdf" | "other" {
  const raw = normalizeKey(
    pickString(input.kind, input.type, input.label, input.name, input.mimeType, input.mime_type, input.sourceUrl, input.url) ?? "",
  );
  if (raw.includes("dpe")) return "dpe_pdf";
  if (raw.includes("diagnostic")) return "diagnostic_pdf";
  if (raw.includes("plan") || raw.includes("floor")) return "floor_plan_pdf";
  if (raw.includes("brochure") || raw.includes("plaquette")) return "brochure_pdf";
  return "other";
}

function buildDocumentRows(properties: ProviderProperty[]): Array<Record<string, unknown>> {
  const now = new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];
  for (const property of properties) {
    const seen = new Set<string>();
    for (const document of property.documents ?? []) {
      const sourceUrl = pickString(document.sourceUrl, document.source_url, document.url, document.href);
      if (!sourceUrl || seen.has(sourceUrl)) continue;
      seen.add(sourceUrl);
      rows.push({
        property_id: property.id,
        kind: inferDocumentKind(document),
        source_url: sourceUrl,
        mime_type: pickString(document.mimeType, document.mime_type) ?? null,
        status: "pending",
        metadata: {
          label: pickString(document.label, document.name) ?? null,
          provider_discovered: true,
        },
        updated_at: now,
      });
    }
  }
  return rows;
}

async function replaceChildCollections(
  supabase: ReturnType<typeof createClient>,
  propertyIds: number[],
  imageRows: Array<Record<string, unknown>>,
  featureRows: Array<Record<string, unknown>>,
): Promise<void> {
  if (propertyIds.length === 0) return;

  for (const batch of chunk(propertyIds, 500)) {
    const imagesDelete = await supabase.from("property_images").delete().in("property_id", batch);
    if (imagesDelete.error) throw imagesDelete.error;

    const featuresDelete = await supabase.from("property_features").delete().in("property_id", batch);
    if (featuresDelete.error) throw featuresDelete.error;
  }

  for (const batch of chunk(imageRows, 500)) {
    if (batch.length === 0) continue;
    const { error } = await supabase.from("property_images").insert(batch);
    if (error) throw error;
  }

  for (const batch of chunk(featureRows, 500)) {
    if (batch.length === 0) continue;
    const { error } = await supabase.from("property_features").insert(batch);
    if (error) throw error;
  }
}

async function upsertPropertyDocumentsAndQueueAnalysisJobs(
  supabase: ReturnType<typeof createClient>,
  properties: ProviderProperty[],
): Promise<{ documentRows: number; queuedJobs: number }> {
  const documentRows = buildDocumentRows(properties);
  if (documentRows.length === 0) {
    return { documentRows: 0, queuedJobs: 0 };
  }

  const propertyIds = Array.from(new Set(documentRows.map((row) => Number(row.property_id)).filter((id) => Number.isInteger(id) && id > 0)));
  let queuedJobs = 0;

  try {
    const expectedUrlsByProperty = new Map<number, Set<string>>();
    for (const row of documentRows) {
      const propertyId = Number(row.property_id);
      const sourceUrl = String(row.source_url ?? "");
      if (!expectedUrlsByProperty.has(propertyId)) expectedUrlsByProperty.set(propertyId, new Set<string>());
      if (sourceUrl) expectedUrlsByProperty.get(propertyId)!.add(sourceUrl);
    }

    for (const batch of chunk(documentRows, 200)) {
      const { error } = await supabase.from("property_documents").upsert(batch, { onConflict: "property_id,kind,source_url" });
      if (error) throw error;
    }

    // Mark provider-discovered documents that disappeared from the latest feed as skipped.
    for (const batch of chunk(propertyIds, 200)) {
      const { data, error } = await supabase
        .from("property_documents")
        .select("id,property_id,source_url,metadata")
        .in("property_id", batch);
      if (error) throw error;
      const toSkipIds = ((data ?? []) as Array<Record<string, unknown>>)
        .filter((row) => {
          const propertyId = Number(row.property_id);
          const sourceUrl = typeof row.source_url === "string" ? row.source_url : "";
          const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {};
          const providerDiscovered = metadata.provider_discovered === true;
          if (!providerDiscovered || !sourceUrl || !Number.isInteger(propertyId)) return false;
          return !expectedUrlsByProperty.get(propertyId)?.has(sourceUrl);
        })
        .map((row) => String(row.id ?? ""))
        .filter(Boolean);

      for (const skipBatch of chunk(toSkipIds, 200)) {
        if (skipBatch.length === 0) continue;
        const { error: updateError } = await supabase
          .from("property_documents")
          .update({
            status: "skipped",
            last_error: "provider_document_missing_in_latest_sync",
            updated_at: new Date().toISOString(),
          })
          .in("id", skipBatch);
        if (updateError) throw updateError;
      }
    }

    const existingQueued = new Set<string>();
    for (const batch of chunk(propertyIds, 500)) {
      const { data, error } = await supabase
        .from("property_media_analysis_jobs")
        .select("property_id,job_type")
        .in("property_id", batch)
        .eq("status", "queued")
        .in("job_type", ["analyze_documents", "refresh_property_media"]);
      if (error) throw error;
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const propertyId = Number(row.property_id);
        const jobType = typeof row.job_type === "string" ? row.job_type : "";
        if (Number.isInteger(propertyId) && jobType) existingQueued.add(`${propertyId}:${jobType}`);
      }
    }

    const jobRows = propertyIds.map((propertyId) => ({
      property_id: propertyId,
      job_type: "analyze_documents",
      status: "queued",
      priority: 60,
      payload: { trigger: "provider_sync" },
    })).filter((row) => !existingQueued.has(`${row.property_id}:${row.job_type}`));

    for (const batch of chunk(jobRows, 200)) {
      if (batch.length === 0) continue;
      const { error } = await supabase.from("property_media_analysis_jobs").insert(batch);
      if (error) throw error;
      queuedJobs += batch.length;
    }
  } catch (error) {
    console.warn("provider_sync_documents_skipped", getErrorMessage(error));
    return { documentRows: 0, queuedJobs: 0 };
  }

  return { documentRows: documentRows.length, queuedJobs };
}

async function queueImageAnalysisJobs(
  supabase: ReturnType<typeof createClient>,
  propertyIds: number[],
): Promise<number> {
  if (propertyIds.length === 0) return 0;
  try {
    let queuedJobs = 0;
    const existingQueued = new Set<string>();
    for (const batch of chunk(propertyIds, 500)) {
      const { data, error } = await supabase
        .from("property_media_analysis_jobs")
        .select("property_id,job_type")
        .in("property_id", batch)
        .eq("status", "queued")
        .in("job_type", ["analyze_images", "refresh_property_media"]);
      if (error) throw error;
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const propertyId = Number(row.property_id);
        const jobType = typeof row.job_type === "string" ? row.job_type : "";
        if (Number.isInteger(propertyId) && jobType) existingQueued.add(`${propertyId}:${jobType}`);
      }
    }

    const rows = propertyIds.map((propertyId) => ({
      property_id: propertyId,
      job_type: "analyze_images",
      status: "queued",
      priority: 55,
      payload: { trigger: "provider_sync" },
    })).filter((row) => !existingQueued.has(`${row.property_id}:${row.job_type}`));
    for (const batch of chunk(rows, 200)) {
      if (batch.length === 0) continue;
      const { error } = await supabase.from("property_media_analysis_jobs").insert(batch);
      if (error) throw error;
      queuedJobs += batch.length;
    }
    return queuedJobs;
  } catch (error) {
    console.warn("provider_sync_image_analysis_jobs_skipped", getErrorMessage(error));
    return 0;
  }
}

async function reconcileMissingProperties(
  supabase: ReturnType<typeof createClient>,
  sourceIds: Set<number>,
): Promise<number> {
  const { data, error } = await supabase
    .from("properties")
    .select("id,status")
    .neq("status", "off_market");

  if (error) throw error;

  const toOffMarket = ((data ?? []) as Array<{ id: number; status: string }>)
    .map((row) => row.id)
    .filter((id) => !sourceIds.has(id));

  for (const batch of chunk(toOffMarket, 500)) {
    if (batch.length === 0) continue;
    const { error: updateError } = await supabase
      .from("properties")
      .update({ status: "off_market", updated_at: new Date().toISOString() })
      .in("id", batch);
    if (updateError) throw updateError;
  }

  return toOffMarket.length;
}

async function runSync(options: CliOptions): Promise<SyncSummary> {
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();

  let supabase: ReturnType<typeof createClient> | null = null;
  if (!options.dryRun) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  }

  const fetched = await fetchProviderProperties(options.mode);
  const limited = options.limit ? fetched.slice(0, options.limit) : fetched;
  const properties = ensureUniqueSlugs(uniqueById(limited));

  const imageRows = buildImageRows(properties);
  const featureRows = buildFeatureRows(properties);
  const documentRows = buildDocumentRows(properties);
  const sourceIds = new Set(properties.map((property) => property.id));

  let offMarketReconciled = 0;
  let mediaAnalysisJobs = 0;

  if (!options.dryRun && properties.length > 0) {
    if (!supabase) {
      throw new Error("Supabase client initialization failed");
    }

    const cityIdBySlug = await upsertCities(supabase, properties);
    const publishedAtById = await queryExistingPropertyPublishedAt(supabase, Array.from(sourceIds));
    const propertyRows = buildPropertyRows(properties, cityIdBySlug, publishedAtById);

    for (const batch of chunk(propertyRows, 200)) {
      const { error } = await supabase.from("properties").upsert(batch, { onConflict: "id" });
      if (error) throw error;
    }

    await replaceChildCollections(supabase, Array.from(sourceIds), imageRows, featureRows);

    mediaAnalysisJobs += await queueImageAnalysisJobs(supabase, Array.from(sourceIds));

    const documentsSync = await upsertPropertyDocumentsAndQueueAnalysisJobs(supabase, properties);
    mediaAnalysisJobs += documentsSync.queuedJobs;

    const shouldReconcile =
      options.mode === "full" || (options.mode === "incremental" && options.reconcileMissing);
    if (shouldReconcile && sourceIds.size > 0) {
      offMarketReconciled = await reconcileMissingProperties(supabase, sourceIds);
    }
  }

  const finishedAtDate = new Date();
  const finishedAt = finishedAtDate.toISOString();
  const durationMs = finishedAtDate.getTime() - startedAtDate.getTime();

  return {
    mode: options.mode,
    dryRun: options.dryRun,
    fetchedCount: fetched.length,
    normalizedCount: limited.length,
    uniqueCount: properties.length,
    cityCount: new Set(properties.map((property) => property.citySlug)).size,
    propertyUpserts: options.dryRun ? 0 : properties.length,
    imageRows: imageRows.length,
    documentRows: documentRows.length,
    featureRows: featureRows.length,
    mediaAnalysisJobs,
    offMarketReconciled,
    startedAt,
    finishedAt,
    durationMs,
  };
}

if (import.meta.main) {
  const options = parseCliOptions(Deno.args);
  runSync(options)
    .then((summary) => {
      console.log("provider_sync_summary", JSON.stringify(summary));
    })
    .catch((error) => {
      console.error("provider_sync_failed", getErrorMessage(error));
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      Deno.exit(1);
    });
}
