import type { City } from "@/types/domain";

export const cities: City[] = [
  {
    id: "city-le-havre",
    name: "Le Havre",
    slug: "le-havre",
    postalCodes: ["76600", "76610", "76620"],
    isActive: true,
    heroImageUrl: "/images/geography/pays-de-caux-original.svg",
  },
  {
    id: "city-sainte-adresse",
    name: "Sainte-Adresse",
    slug: "sainte-adresse",
    postalCodes: ["76310"],
    isActive: true,
    heroImageUrl: "/images/geography/pays-de-caux-original.svg",
  },
  {
    id: "city-montivilliers",
    name: "Montivilliers",
    slug: "montivilliers",
    postalCodes: ["76290"],
    isActive: true,
    heroImageUrl: "/images/geography/pays-de-caux-original.svg",
  },
  {
    id: "city-maneglise",
    name: "Manéglise",
    slug: "maneglise",
    postalCodes: ["76133"],
    isActive: true,
    heroImageUrl: "/images/geography/pays-de-caux-original.svg",
  },
  {
    id: "city-gainneville",
    name: "Gainneville",
    slug: "gainneville",
    postalCodes: ["76700"],
    isActive: true,
    heroImageUrl: "/images/geography/pays-de-caux-original.svg",
  },
  {
    id: "city-harfleur",
    name: "Harfleur",
    slug: "harfleur",
    postalCodes: ["76700"],
    isActive: true,
    heroImageUrl: "/images/geography/pays-de-caux-original.svg",
  },
  {
    id: "city-octeville-sur-mer",
    name: "Octeville-sur-Mer",
    slug: "octeville-sur-mer",
    postalCodes: ["76930"],
    isActive: true,
    heroImageUrl: "/images/geography/pays-de-caux-original.svg",
  },
  {
    id: "city-fontaine-la-mallet",
    name: "Fontaine-la-Mallet",
    slug: "fontaine-la-mallet",
    postalCodes: ["76290"],
    isActive: true,
    heroImageUrl: "/images/geography/pays-de-caux-original.svg",
  },
  {
    id: "city-honfleur",
    name: "Honfleur",
    slug: "honfleur",
    postalCodes: ["14600"],
    isActive: true,
    heroImageUrl: "/images/geography/pays-de-caux-original.svg",
  },
  {
    id: "city-saint-romain-de-colbosc",
    name: "Saint-Romain-de-Colbosc",
    slug: "saint-romain-de-colbosc",
    postalCodes: ["76430"],
    isActive: true,
    heroImageUrl: "/images/geography/pays-de-caux-original.svg",
  },
];

export const cityBySlug = new Map(cities.map((city) => [city.slug, city]));
export const cityById = new Map(cities.map((city) => [city.id, city]));
