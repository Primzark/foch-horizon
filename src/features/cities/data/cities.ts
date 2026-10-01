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
];

export const cityBySlug = new Map(cities.map((city) => [city.slug, city]));
export const cityById = new Map(cities.map((city) => [city.id, city]));
