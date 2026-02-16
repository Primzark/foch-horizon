#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SOURCE_HOST = "https://www.fochimmobilier.com";
const LISTING_PATH = "/biens-immobiliers";
const OUTPUT_PROPERTIES_PATH = resolve(process.cwd(), "src/features/listings/data/properties.ts");
const OUTPUT_AUDIT_PATH = resolve(process.cwd(), "docs/audit/2026-02-16/live-annonces-sync.md");

const AGENT_FROM_CONTACT = {
  alain: "agent-jeanne-morel",
  emma: "agent-lucas-bernard",
  vero: "agent-clara-durand",
  veronique: "agent-clara-durand",
  dries: "agent-dries-hubert",
};

const CITY_ID_FROM_NAME = {
  "le havre": "city-le-havre",
  "sainte adresse": "city-sainte-adresse",
  "sainte-adresse": "city-sainte-adresse",
  montivilliers: "city-montivilliers",
  maneglise: "city-maneglise",
  gainneville: "city-gainneville",
};

const FEATURE_FALLBACK = ["Appartement", "Maison", "Terrasse", "Balcon", "Cave", "Garage", "Parking", "Vue mer", "Jardin", "Ascenseur"];

function decodeHtml(value) {
  if (!value) return "";

  const entityMap = {
    amp: "&",
    quot: '"',
    apos: "'",
    nbsp: " ",
    eacute: "é",
    egrave: "è",
    ecirc: "ê",
    agrave: "à",
    acirc: "â",
    auml: "ä",
    ugrave: "ù",
    ucirc: "û",
    uuml: "ü",
    icirc: "î",
    iuml: "ï",
    ocirc: "ô",
    ouml: "ö",
    ccedil: "ç",
    rsquo: "'",
    lsquo: "'",
    euro: "€",
    deg: "°",
    sup2: "²",
  };

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&([a-zA-Z]+);/g, (_, name) => entityMap[name] ?? `&${name};`);
}

function stripTags(value) {
  return decodeHtml(value).replace(/<[^>]+>/g, " ");
}

function normalizeSpace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanText(value) {
  return normalizeSpace(stripTags(value).replace(/\u00a0/g, " "));
}

function normalizeKey(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toSlug(value) {
  const slug = normalizeKey(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "annonce";
}

function toFeatureKey(value) {
  return normalizeKey(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "feature";
}

function toNumber(value) {
  if (!value) return null;
  const normalized = value
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractFirstNumber(value) {
  if (!value) return null;
  const match = value.replace(/\u00a0/g, " ").match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  return toNumber(match[0]);
}

function extractMetaContent(html, name) {
  const tagRegex = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*>`, "i");
  const tag = tagRegex.exec(html)?.[0] ?? "";
  if (!tag) return "";
  const contentMatch = tag.match(/content=["']([^"']*)["']/i);
  return contentMatch?.[1] ?? "";
}

function extractKeywordsValue(keywords, key) {
  const re = new RegExp(`${key},\\s*([^,\"\\n]+)`, "i");
  const raw = re.exec(keywords)?.[1] ?? "";
  return cleanText(raw);
}

function mapCityId(cityName) {
  const normalized = normalizeKey(cityName).replace(/-/g, " ");
  return CITY_ID_FROM_NAME[normalized] ?? "city-le-havre";
}

function mapPropertyType(rawType) {
  const value = normalizeKey(rawType);
  if (value.includes("appartement")) return "appartement";
  if (value.includes("maison") || value.includes("villa")) return "maison_villa";
  return "autre";
}

function mapTransaction(rawStatus) {
  const status = normalizeKey(rawStatus);
  if (status.includes("location") || status.includes("loue") || status.includes("loue")) {
    return "location";
  }
  return "vente";
}

function mapStatus(rawStatus) {
  const status = normalizeKey(rawStatus);
  if (status.includes("sous offre")) return "under_offer";
  if (status.includes("vendu")) return "sold";
  if (status.includes("loue") || status.includes("louee")) return "rented";
  if (status.includes("retire")) return "off_market";
  return "active";
}

function mapAgentId(contactToken, detailHtml) {
  const token = normalizeKey(contactToken);
  if (token && AGENT_FROM_CONTACT[token]) {
    return AGENT_FROM_CONTACT[token];
  }

  const nameMatch = detailHtml.match(/<h3 class="title-d">\s*([^<\n]+)\s*<br>/i);
  if (nameMatch) {
    const candidate = normalizeKey(nameMatch[1]);
    if (candidate.includes("alain")) return AGENT_FROM_CONTACT.alain;
    if (candidate.includes("emma")) return AGENT_FROM_CONTACT.emma;
    if (candidate.includes("veronique") || candidate.includes("vero")) return AGENT_FROM_CONTACT.vero;
    if (candidate.includes("dries")) return AGENT_FROM_CONTACT.dries;
  }

  return "agent-jeanne-morel";
}

function unique(values) {
  return Array.from(new Set(values));
}

function pickEnergy(labelRaw, valueRaw) {
  const label = (labelRaw || "").toUpperCase().trim();
  const value = toNumber(valueRaw);
  if (!/[A-G]/.test(label)) {
    return { label: null, value: null };
  }
  return { label, value };
}

function parseSummaryMap(html) {
  const summaryMap = new Map();
  const liRegex = /<li[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<span>([\s\S]*?)<\/span>\s*<\/li>/gi;
  let match;

  while ((match = liRegex.exec(html)) !== null) {
    const rawLabel = cleanText(match[1]).replace(/:$/, "");
    const rawValue = cleanText(match[2]);
    if (!rawLabel) continue;
    summaryMap.set(normalizeKey(rawLabel), rawValue);
  }

  return summaryMap;
}

function parseFeatures(html, propertyType) {
  const blockMatch = html.match(/<div class="amenities-list[\s\S]*?<\/ul>[\s\S]*?<\/div>/i);
  if (!blockMatch) {
    return propertyType === "appartement" ? ["Appartement"] : ["Maison"];
  }

  const liRegex = /<li>([\s\S]*?)<\/li>/gi;
  const features = [];
  let match;

  while ((match = liRegex.exec(blockMatch[0])) !== null) {
    const label = cleanText(match[1]);
    if (label) features.push(label);
  }

  if (features.length === 0) {
    return propertyType === "appartement" ? ["Appartement"] : ["Maison"];
  }

  return unique(features.filter((feature) => FEATURE_FALLBACK.includes(feature) || feature.length > 1));
}

function parseImages(html) {
  const images = [];
  const carouselBlock = html.match(/<div id="property-single-carousel"[\s\S]*?<\/div>\s*<div class="property-single-carousel-pagination/i)?.[0] ?? html;
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(carouselBlock)) !== null) {
    const src = match[1].trim();
    if (!src) continue;
    const absolute = src.startsWith("http") ? src : `${SOURCE_HOST}${src.startsWith("/") ? "" : "/"}${src}`;
    if (/\/wa\/images\/biens\//i.test(absolute)) {
      images.push(absolute);
    }
  }

  return unique(images);
}

function parsePropertyDetail(id, html, orderIndex) {
  const keywords = extractMetaContent(html, "keywords");
  const summary = parseSummaryMap(html);

  const title =
    cleanText(html.match(/<h1 class="title-single">([\s\S]*?)<\/h1>/i)?.[1] ?? "") ||
    extractKeywordsValue(keywords, "Titre") ||
    `Annonce ${id}`;

  const statusLabel = summary.get("statut") || extractKeywordsValue(keywords, "Categorie") || "Vente";
  const transactionType = mapTransaction(statusLabel);
  const status = mapStatus(statusLabel);

  const typeLabel = summary.get("type de bien") || extractKeywordsValue(keywords, "TypeBien") || "autre";
  const propertyType = mapPropertyType(typeLabel);

  const placeLabel = summary.get("lieu") || `${extractKeywordsValue(keywords, "CodePostal")}, ${extractKeywordsValue(keywords, "Ville")}`;
  const locationMatch = placeLabel.match(/(\d{5})\s*,?\s*(.*)/);
  const postalCode = locationMatch?.[1] || extractKeywordsValue(keywords, "CodePostal") || "76600";
  const cityName = cleanText(locationMatch?.[2] || extractKeywordsValue(keywords, "Ville") || "Le Havre");
  const cityId = mapCityId(cityName);

  const priceAmount =
    toNumber(cleanText(html.match(/<h5 class="title-c">([\s\S]*?)<\/h5>/i)?.[1] ?? "")) ??
    toNumber(extractKeywordsValue(keywords, "Prix")) ??
    0;

  const surfaceM2 =
    toNumber(extractKeywordsValue(keywords, "SurfaceHab")) ??
    extractFirstNumber(summary.get("surface") || "") ??
    0;

  const rooms = toNumber(extractKeywordsValue(keywords, "Pieces"));
  const bedrooms = toNumber(summary.get("chambre(s)") || extractKeywordsValue(keywords, "Chambres"));
  const bathrooms = toNumber(summary.get("salle(s) de bain") || extractKeywordsValue(keywords, "Sdb"));
  const parkingCount = toNumber(summary.get("parking(s)") || "0") ?? 0;
  const garageCount = toNumber(summary.get("garage(s)") || "0") ?? 0;

  const dpeSummary = summary.get("dpe") || "";
  const gesSummary = summary.get("ges") || "";

  const dpeFromSummaryLabel = dpeSummary.match(/Cat\.\s*([A-G])/i)?.[1] ?? "";
  const dpeFromSummaryValue = dpeSummary.match(/-\s*([0-9]+)\s*kWh/i)?.[1] ?? "";
  const gesFromSummaryLabel = gesSummary.match(/Cat\.\s*([A-G])/i)?.[1] ?? "";
  const gesFromSummaryValue = gesSummary.match(/-\s*([0-9]+)\s*kg/i)?.[1] ?? "";

  const dpe = pickEnergy(dpeFromSummaryLabel || extractKeywordsValue(keywords, "LettreDPE"), dpeFromSummaryValue || extractKeywordsValue(keywords, "ValeurDPE"));
  const ges = pickEnergy(gesFromSummaryLabel || extractKeywordsValue(keywords, "LettreGES"), gesFromSummaryValue || extractKeywordsValue(keywords, "ValeurGES"));

  const description =
    cleanText(html.match(/<p class="description color-text-a no-margin">([\s\S]*?)<\/p>/i)?.[1] ?? "") ||
    cleanText(html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] ?? "") ||
    title;

  const images = parseImages(html);
  const contactToken = extractKeywordsValue(keywords, "Contact");
  const agentId = mapAgentId(contactToken, html);

  const features = parseFeatures(html, propertyType).map((label) => ({
    propertyId: id,
    featureKey: toFeatureKey(label),
    labelFr: label,
  }));

  const now = new Date(Date.now() - orderIndex * 60_000).toISOString();

  return {
    id,
    title,
    slug: toSlug(title),
    transactionType,
    propertyType,
    status,
    priceAmount,
    priceCurrency: "EUR",
    surfaceM2,
    terrainM2: null,
    rooms,
    bedrooms,
    bathrooms,
    parkingCount,
    garageCount,
    dpeLabel: dpe.label,
    dpeValue: dpe.value,
    gesLabel: ges.label,
    gesValue: ges.value,
    description,
    cityId,
    postalCode,
    lat: null,
    lng: null,
    agentId,
    publishedAt: now,
    updatedAt: now,
    isFeatured: orderIndex < 9,
    images: images.map((sourceUrl, imageIndex) => ({
      id: `${id}-${imageIndex + 1}`,
      propertyId: id,
      sourceUrl,
      sortOrder: imageIndex,
      altText: `${title} - photo ${imageIndex + 1}`,
    })),
    features,
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; FochSync/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} for ${url}`);
  }

  return response.text();
}

function extractAnnouncementIds(html) {
  const ids = [];
  const regex = /href="\/annonce\/(\d+)"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    ids.push(Number(match[1]));
  }
  return unique(ids).sort((a, b) => b - a);
}

async function parallelMap(values, limit, mapper) {
  const results = new Array(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return results;
}

function ensureUniqueSlugs(items) {
  const seen = new Map();
  return items.map((item) => {
    const count = seen.get(item.slug) ?? 0;
    seen.set(item.slug, count + 1);
    if (count === 0) return item;
    return { ...item, slug: `${item.slug}-${item.id}` };
  });
}

function renderPropertiesFile(items) {
  const payload = JSON.stringify(items, null, 2);

  return `import type { Property } from "@/types/domain";\n\n// Generated by scripts/sync-fochimmobilier-properties.mjs\n// Source: ${SOURCE_HOST}${LISTING_PATH}\n\nexport const properties: Property[] = ${payload};\n\nexport const propertyById = new Map(properties.map((property) => [property.id, property]));\nexport const propertyBySlug = new Map(properties.map((property) => [property.slug, property]));\n`;
}

function renderAuditReport(ids, items) {
  const cityCounts = new Map();
  items.forEach((item) => {
    cityCounts.set(item.cityId, (cityCounts.get(item.cityId) ?? 0) + 1);
  });

  const citySummary = Array.from(cityCounts.entries())
    .map(([cityId, count]) => `- ${cityId}: ${count}`)
    .join("\n");

  return `# Live annonces sync report\n\nGenerated: ${new Date().toISOString()}\nSource: ${SOURCE_HOST}${LISTING_PATH}\n\n## Counts\n- Listing ids discovered: ${ids.length}\n- Properties generated: ${items.length}\n\n## Cities\n${citySummary}\n\n## IDs\n${ids.map((id) => `- ${id}`).join("\n")}\n`;
}

async function main() {
  const listHtml = await fetchText(`${SOURCE_HOST}${LISTING_PATH}`);
  const ids = extractAnnouncementIds(listHtml);

  if (ids.length === 0) {
    throw new Error("No announcement ids found on listing page.");
  }

  const parsed = await parallelMap(ids, 6, async (id, index) => {
    const html = await fetchText(`${SOURCE_HOST}/annonce/${id}`);
    return parsePropertyDetail(id, html, index);
  });

  const withSlugs = ensureUniqueSlugs(parsed);

  mkdirSync(dirname(OUTPUT_PROPERTIES_PATH), { recursive: true });
  writeFileSync(OUTPUT_PROPERTIES_PATH, renderPropertiesFile(withSlugs), "utf8");

  mkdirSync(dirname(OUTPUT_AUDIT_PATH), { recursive: true });
  writeFileSync(OUTPUT_AUDIT_PATH, renderAuditReport(ids, withSlugs), "utf8");

  console.log(`Generated ${withSlugs.length} properties into ${OUTPUT_PROPERTIES_PATH}`);
  console.log(`Audit report written to ${OUTPUT_AUDIT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
