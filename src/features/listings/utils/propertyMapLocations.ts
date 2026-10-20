import type { PropertySearchItem } from "@/types/api";

export type PropertyMapLocationBasis = "listing_text" | "postal_code" | "city" | "fallback";

export interface ApproximatePropertyMapLocation {
  position: [number, number];
  label: string;
  basis: PropertyMapLocationBasis;
}

type LocationHint = {
  citySlug: string;
  terms: string[];
  label: string;
  position: [number, number];
};

// Commune centers are based on the existing communeLocations data sourced from geo.api.gouv.fr.
// The extra Fontaine-la-Mallet center comes from the same public commune reference.
const CITY_CENTERS: Record<string, [number, number]> = {
  "le-havre": [49.4943, 0.1078],
  "sainte-adresse": [49.5051, 0.0858],
  montivilliers: [49.5457, 0.1924],
  maneglise: [49.5662, 0.2555],
  gainneville: [49.5174, 0.2649],
  harfleur: [49.5078, 0.2],
  "octeville-sur-mer": [49.5553, 0.1163],
  "fontaine-la-mallet": [49.5415, 0.1399],
  honfleur: [49.4202, 0.2345],
  "cauville-sur-mer": [49.5954, 0.1307],
  "saint-romain-de-colbosc": [49.5291, 0.3581],
};

// OSM postal-area reference points; property-level markers remain deliberately approximate.
const LE_HAVRE_POSTAL_CENTERS: Record<string, [number, number]> = {
  "76610": [49.5101322, 0.1569893],
  "76620": [49.5131165, 0.1056452],
};

// These are neighborhood or landmark centers, not property addresses. The map still offsets
// each marker slightly so it does not imply that the listing's exact building is disclosed.
const LOCATION_HINTS: LocationHint[] = [
  {
    citySlug: "le-havre",
    terms: ["entre coty et danton", "entre danton et coty"],
    label: "secteur Coty–Danton",
    position: [49.496009, 0.11809],
  },
  {
    citySlug: "le-havre",
    terms: ["entre palais de justice et bassin du commerce", "entre bassin du commerce et palais de justice"],
    label: "secteur Palais de justice–Bassin du Commerce",
    position: [49.491466, 0.115225],
  },
  {
    citySlug: "le-havre",
    terms: ["entre le square saint roch et la plage", "entre square saint roch et la plage"],
    label: "secteur Saint-Roch–plage",
    position: [49.4935, 0.0974],
  },
  { citySlug: "le-havre", terms: ["dollemard"], label: "Dollemard", position: [49.5204158, 0.0778852] },
  { citySlug: "le-havre", terms: ["place de bleville", "bleville"], label: "Bléville", position: [49.5174437, 0.097968] },
  { citySlug: "le-havre", terms: ["sainte cecile"], label: "Sainte-Cécile", position: [49.5087909, 0.1474464] },
  { citySlug: "le-havre", terms: ["saint vincent"], label: "Saint-Vincent", position: [49.4982354, 0.0927509] },
  { citySlug: "le-havre", terms: ["sanvic eglise", "eglise sanvic"], label: "Sanvic–église", position: [49.5057242, 0.1063322] },
  { citySlug: "le-havre", terms: ["sanvic"], label: "Sanvic", position: [49.5057242, 0.1063322] },
  { citySlug: "le-havre", terms: ["felix faure", "parc d or"], label: "Félix-Faure", position: [49.5013884, 0.1078784] },
  { citySlug: "le-havre", terms: ["parc hauser", "joffre"], label: "Parc Hauser–Joffre", position: [49.5025169, 0.1263509] },
  { citySlug: "le-havre", terms: ["saint michel"], label: "Saint-Michel", position: [49.4970109, 0.109112] },
  { citySlug: "le-havre", terms: ["graville"], label: "Graville", position: [49.5018963, 0.1623279] },
  { citySlug: "le-havre", terms: ["montmorency"], label: "Montmorency", position: [49.5010005, 0.1461406] },
  { citySlug: "le-havre", terms: ["foret de montgeon", "montgeon"], label: "Montgeon", position: [49.5204058, 0.1409931] },
  { citySlug: "le-havre", terms: ["sainte anne"], label: "Sainte-Anne", position: [49.4974222, 0.1217131] },
  { citySlug: "le-havre", terms: ["les ormeaux", "ormeaux"], label: "Les Ormeaux", position: [49.5005593, 0.1219064] },
  { citySlug: "le-havre", terms: ["les docks", "docks"], label: "Les Docks", position: [49.4871637, 0.1271629] },
  { citySlug: "le-havre", terms: ["bassin du commerce"], label: "Bassin du Commerce", position: [49.4903219, 0.1125067] },
  { citySlug: "le-havre", terms: ["palais de justice"], label: "Palais de justice", position: [49.4926107, 0.1179439] },
  { citySlug: "le-havre", terms: ["face casino", "pasino", "casino"], label: "secteur du casino", position: [49.4913136, 0.1120619] },
  { citySlug: "le-havre", terms: ["volcan"], label: "Le Volcan", position: [49.4903417, 0.1069732] },
  { citySlug: "le-havre", terms: ["universite"], label: "Université", position: [49.4863073, 0.1278515] },
  { citySlug: "le-havre", terms: ["centre coty", "coty"], label: "Coty", position: [49.4973928, 0.1133512] },
  { citySlug: "le-havre", terms: ["danton"], label: "Danton", position: [49.4961801, 0.1245415] },
  { citySlug: "le-havre", terms: ["square saint roch", "saint roch"], label: "Saint-Roch", position: [49.4947626, 0.1020425] },
  { citySlug: "le-havre", terms: ["hotel de ville", "rue de paris"], label: "Hôtel de Ville–Perret", position: [49.4939826, 0.1090934] },
  {
    citySlug: "sainte-adresse",
    terms: ["phare de la heve", "phare de sainte adresse", "phare"],
    label: "Phare de la Hève",
    position: [49.512411, 0.0692629],
  },
  {
    citySlug: "octeville-sur-mer",
    terms: ["golf d octeville", "au coeur du golf", "chemin du golf", "golf"],
    label: "Golf d’Octeville-sur-Mer",
    position: [49.5768765, 0.1226717],
  },
];

function normalizeLocationText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hasLocationTerm(text: string, term: string): boolean {
  return ` ${text} `.includes(` ${normalizeLocationText(term)} `);
}

function addPrivacyOffset(position: [number, number], propertyId: number): [number, number] {
  const [latitude, longitude] = position;
  const bearing = ((propertyId * 137.508) % 360) * (Math.PI / 180);
  const distance = 45 + (propertyId % 4) * 20;
  const latitudeOffset = (Math.cos(bearing) * distance) / 111_000;
  const longitudeOffset = (Math.sin(bearing) * distance) / (111_000 * Math.cos((latitude * Math.PI) / 180));

  return [latitude + latitudeOffset, longitude + longitudeOffset];
}

export function resolveApproximatePropertyMapLocation(
  item: Pick<PropertySearchItem, "id" | "title" | "description" | "city">,
): ApproximatePropertyMapLocation {
  const citySlug = normalizeLocationText(item.city.slug || item.city.name).replace(/\s+/g, "-");
  const title = normalizeLocationText(item.title);
  const description = normalizeLocationText(item.description);

  const hint = LOCATION_HINTS.find(
    (candidate) => candidate.citySlug === citySlug && candidate.terms.some((term) => hasLocationTerm(title, term)),
  ) ?? LOCATION_HINTS.find(
    (candidate) => candidate.citySlug === citySlug && candidate.terms.some((term) => hasLocationTerm(description, term)),
  );

  if (hint) {
    return {
      position: addPrivacyOffset(hint.position, item.id),
      label: hint.label,
      basis: "listing_text",
    };
  }

  const postalCenter = citySlug === "le-havre" ? LE_HAVRE_POSTAL_CENTERS[item.city.postalCode] : undefined;
  if (postalCenter) {
    return {
      position: addPrivacyOffset(postalCenter, item.id),
      label: `code postal ${item.city.postalCode}`,
      basis: "postal_code",
    };
  }

  const cityCenter = CITY_CENTERS[citySlug];
  if (cityCenter) {
    return { position: addPrivacyOffset(cityCenter, item.id), label: item.city.name, basis: "city" };
  }

  return {
    position: addPrivacyOffset(cityCenter ?? CITY_CENTERS["le-havre"], item.id),
    label: item.city.name || "Secteur du Havre",
    basis: "fallback",
  };
}
