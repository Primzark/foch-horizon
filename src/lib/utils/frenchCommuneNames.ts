import { cities } from "@/features/cities/data/cities";
import communeLocations from "@/features/content/data/communeLocations.json";

function normalizeCommuneName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[\p{P}\p{Z}_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("fr");
}

const canonicalNamesByKey = new Map<string, string>();
for (const city of cities) {
  canonicalNamesByKey.set(normalizeCommuneName(city.slug), city.name);
  canonicalNamesByKey.set(normalizeCommuneName(city.name), city.name);
}
for (const [slug, location] of Object.entries(communeLocations)) {
  canonicalNamesByKey.set(normalizeCommuneName(slug), location.name);
  canonicalNamesByKey.set(normalizeCommuneName(location.name), location.name);
}
canonicalNamesByKey.set("havre", "Le Havre");

const communeNames = [...new Set([...cities.map((city) => city.name), ...Object.values(communeLocations).map((location) => location.name), "Saint-Michel"])]
  .sort((left, right) => right.length - left.length);

const accentVariants: Record<string, string> = {
  a: "aàáâãäå",
  c: "cç",
  e: "eèéêë",
  i: "iìíîï",
  n: "nñ",
  o: "oòóôõö",
  u: "uùúûü",
  y: "yýÿ",
};

function letterPattern(character: string): string {
  const base = character.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  return "[" + (accentVariants[base] ?? base) + "]";
}

function namePattern(name: string): string {
  return name
    .split(/[\s\p{Pd}'’]+/u)
    .map((word) => Array.from(word, letterPattern).join(""))
    .join("[\\s\\p{Pd}'’]*");
}

/** Returns the official display spelling for a known local commune. */
export function formatFrenchCommuneName(name: string, slug?: string): string {
  const normalizedSlug = slug?.replace(/^city[-_]/i, "");
  return (normalizedSlug ? canonicalNamesByKey.get(normalizeCommuneName(normalizedSlug)) : undefined)
    ?? canonicalNamesByKey.get(normalizeCommuneName(name))
    ?? name.trim();
}

/** Repairs local commune spellings in titles, descriptions, labels, and alt text. */
export function correctFrenchCommuneMentions(value: string): string {
  const trimmed = value.trim();
  if (normalizeCommuneName(trimmed) === "havre") {
    const leading = value.match(/^\s*/)?.[0] ?? "";
    const trailing = value.match(/\s*$/)?.[0] ?? "";
    return leading + "Le Havre" + trailing;
  }

  let corrected = value;
  for (const name of communeNames) {
    const matcher = new RegExp(
      "(^|[^\\p{L}\\p{N}])(" + namePattern(name) + ")(?=$|[^\\p{L}\\p{N}])",
      "giu",
    );
    corrected = corrected.replace(matcher, (_match, boundary: string) => boundary + name);
  }
  return corrected.replace(/\s+([,.;:!?])/g, "$1");
}
