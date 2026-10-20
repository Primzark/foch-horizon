import { geographyGuideOptions } from "@/features/content/data/geographyGuideOptions";

export interface ListingLocationOption {
  id: string;
  name: string;
  city?: string;
  query?: string;
}

/** Location filters available on the listings page, including local guide areas. */
export const listingLocationOptions: readonly ListingLocationOption[] = [
  ...geographyGuideOptions,
  { id: "cauville-sur-mer", name: "Cauville-sur-Mer", query: "Cauville-sur-Mer" },
  { id: "les-docks", name: "Les Docks", city: "le-havre", query: "Docks" },
  { id: "honfleur", name: "Honfleur", city: "honfleur" },
];
