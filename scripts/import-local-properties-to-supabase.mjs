#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const PROJECT_ROOT = process.cwd();
const PROPERTIES_FILE = resolve(PROJECT_ROOT, "src/features/listings/data/properties.ts");
const CITIES_FILE = resolve(PROJECT_ROOT, "src/features/cities/data/cities.ts");
const AGENTS_FILE = resolve(PROJECT_ROOT, "src/features/listings/data/agents.ts");

const DEFAULT_BATCH_SIZE = 100;
const BULK_BATCH_SIZE = 250;
const DELETE_BATCH_SIZE = 60;

function chunk(items, size) {
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function stableUuidFromKey(key) {
  const hex = createHash("sha1").update(`foch-import:${key}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

function toNullableText(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function loadTsModuleExports(filePath) {
  const source = readFileSync(filePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require: (specifier) => {
      throw new Error(`Unexpected runtime import in ${filePath}: ${specifier}`);
    },
    console,
    process,
    Map,
    Set,
    Date,
  };

  vm.runInNewContext(transpiled, sandbox, { filename: filePath });
  return module.exports;
}

function readLocalInventory() {
  const { properties } = loadTsModuleExports(PROPERTIES_FILE);
  const { cities } = loadTsModuleExports(CITIES_FILE);
  const { agents } = loadTsModuleExports(AGENTS_FILE);

  if (!Array.isArray(properties) || !Array.isArray(cities) || !Array.isArray(agents)) {
    throw new Error("Failed to load local inventory modules.");
  }

  return { properties, cities, agents };
}

function buildLocalCityMaps(cities) {
  const byId = new Map();
  const bySlug = new Map();
  for (const city of cities) {
    byId.set(city.id, city);
    bySlug.set(city.slug, city);
  }
  return { byId, bySlug };
}

function dedupeBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    map.set(keyFn(item), item);
  }
  return Array.from(map.values());
}

function createSupabaseRestClient({ supabaseUrl, serviceRoleKey }) {
  const baseUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;

  async function request(table, { method = "GET", query, body, prefer } = {}) {
    const url = new URL(`${baseUrl}/${table}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value == null) continue;
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Supabase REST ${method} ${table} failed (${response.status}): ${text.slice(0, 500)}`);
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Supabase REST ${method} ${table} returned non-JSON response.`);
    }
  }

  return { request };
}

async function upsertCities(rest, localCities) {
  const cityRows = localCities.map((city) => ({
    name: city.name,
    slug: city.slug,
    postal_codes: Array.isArray(city.postalCodes) ? city.postalCodes : [],
    is_active: Boolean(city.isActive),
    hero_image_url: toNullableText(city.heroImageUrl),
    updated_at: new Date().toISOString(),
  }));

  const rows = await rest.request("cities", {
    method: "POST",
    query: {
      on_conflict: "slug",
      select: "id,slug",
    },
    body: cityRows,
    prefer: "resolution=merge-duplicates,return=representation",
  });

  const slugToDbId = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.slug && row?.id) {
      slugToDbId.set(row.slug, row.id);
    }
  }

  const localIdToDbId = new Map();
  for (const city of localCities) {
    const dbId = slugToDbId.get(city.slug);
    if (!dbId) {
      throw new Error(`City upsert succeeded but no DB id returned for slug "${city.slug}"`);
    }
    localIdToDbId.set(city.id, dbId);
  }

  return localIdToDbId;
}

async function upsertAgents(rest, localAgents) {
  const localIdToDbId = new Map();
  const payload = [];

  for (const agent of localAgents) {
    const dbId = stableUuidFromKey(`agent:${agent.id}`);
    localIdToDbId.set(agent.id, dbId);
    payload.push({
      id: dbId,
      full_name: agent.fullName,
      role: agent.role,
      phone: toNullableText(agent.phone),
      mobile: toNullableText(agent.mobile),
      email: toNullableText(agent.email),
      portrait_url: toNullableText(agent.portraitUrl),
      bio: toNullableText(agent.bio),
      is_active: agent.isActive !== false,
      updated_at: new Date().toISOString(),
    });
  }

  for (const batch of chunk(payload, DEFAULT_BATCH_SIZE)) {
    await rest.request("agents", {
      method: "POST",
      query: { on_conflict: "id" },
      body: batch,
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }

  return localIdToDbId;
}

function mapPropertyRow(property, cityIdToDbId, agentIdToDbId) {
  const cityDbId = cityIdToDbId.get(property.cityId) ?? null;
  if (!cityDbId) {
    throw new Error(`Missing DB city id for local city "${property.cityId}" (property ${property.id})`);
  }

  return {
    id: property.id,
    title: property.title,
    slug: property.slug,
    transaction_type: property.transactionType,
    property_type: property.propertyType,
    status: property.status,
    price_amount: Number(property.priceAmount ?? 0),
    price_currency: property.priceCurrency ?? "EUR",
    surface_m2: property.surfaceM2,
    terrain_m2: property.terrainM2,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parking_count: property.parkingCount,
    garage_count: property.garageCount,
    dpe_label: property.dpeLabel,
    dpe_value: property.dpeValue,
    ges_label: property.gesLabel,
    ges_value: property.gesValue,
    description: property.description ?? null,
    city_id: cityDbId,
    postal_code: property.postalCode ?? null,
    lat: property.lat,
    lng: property.lng,
    agent_id: agentIdToDbId.get(property.agentId) ?? null,
    published_at: property.publishedAt ?? null,
    updated_at: property.updatedAt ?? new Date().toISOString(),
  };
}

function buildImageRows(properties) {
  const rows = [];
  for (const property of properties) {
    for (const image of Array.isArray(property.images) ? property.images : []) {
      if (!image?.sourceUrl) continue;
      rows.push({
        property_id: property.id,
        source_url: image.sourceUrl,
        sort_order: Number.isFinite(Number(image.sortOrder)) ? Number(image.sortOrder) : 0,
        alt_text: toNullableText(image.altText),
      });
    }
  }
  return dedupeBy(rows, (row) => `${row.property_id}::${row.source_url}`);
}

function buildFeatureRows(properties) {
  const rows = [];
  for (const property of properties) {
    for (const feature of Array.isArray(property.features) ? property.features : []) {
      if (!feature?.featureKey || !feature?.labelFr) continue;
      rows.push({
        property_id: property.id,
        feature_key: feature.featureKey,
        label_fr: feature.labelFr,
      });
    }
  }
  return dedupeBy(rows, (row) => `${row.property_id}::${row.feature_key}`);
}

async function replaceChildRows(rest, table, propertyIds, rows, conflictColumns) {
  for (const idBatch of chunk(propertyIds, DELETE_BATCH_SIZE)) {
    await rest.request(table, {
      method: "DELETE",
      query: { property_id: `in.(${idBatch.join(",")})` },
      prefer: "return=minimal",
    });
  }

  for (const rowBatch of chunk(rows, BULK_BATCH_SIZE)) {
    await rest.request(table, {
      method: "POST",
      ...(conflictColumns ? { query: { on_conflict: conflictColumns } } : {}),
      body: rowBatch,
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }
}

async function main() {
  const { properties, cities, agents } = readLocalInventory();
  const localCityMaps = buildLocalCityMaps(cities);

  const propertiesWithKnownCities = properties.filter((property) => localCityMaps.byId.has(property.cityId));
  const propertyIds = propertiesWithKnownCities.map((property) => property.id);
  const imageRows = buildImageRows(propertiesWithKnownCities);
  const featureRows = buildFeatureRows(propertiesWithKnownCities);

  console.log(`[import] Local inventory loaded`);
  console.log(`[import] Properties: ${properties.length} (${propertiesWithKnownCities.length} with known cities)`);
  console.log(`[import] Cities: ${cities.length}`);
  console.log(`[import] Agents: ${agents.length}`);
  console.log(`[import] Images: ${imageRows.length}`);
  console.log(`[import] Features: ${featureRows.length}`);

  if (dryRun) {
    console.log("[import] Dry run complete (no Supabase writes).");
    return;
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_PROJECT_URL || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL (or VITE_SUPABASE_PROJECT_URL) and/or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const rest = createSupabaseRestClient({ supabaseUrl, serviceRoleKey });

  console.log("[import] Upserting cities...");
  const cityIdToDbId = await upsertCities(rest, cities);

  console.log("[import] Upserting agents...");
  const agentIdToDbId = await upsertAgents(rest, agents);

  console.log("[import] Upserting properties...");
  const propertyRows = propertiesWithKnownCities.map((property) => mapPropertyRow(property, cityIdToDbId, agentIdToDbId));
  for (const batch of chunk(propertyRows, DEFAULT_BATCH_SIZE)) {
    await rest.request("properties", {
      method: "POST",
      query: { on_conflict: "id" },
      body: batch,
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }

  console.log("[import] Replacing property images...");
  await replaceChildRows(rest, "property_images", propertyIds, imageRows, "property_id,source_url");

  console.log("[import] Replacing property features...");
  await replaceChildRows(rest, "property_features", propertyIds, featureRows, "property_id,feature_key");

  console.log("[import] Supabase edge inventory import complete.");
  console.log(`[import] Imported properties: ${propertyRows.length}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
