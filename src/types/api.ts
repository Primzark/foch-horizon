import type { Property, TransactionType, PropertyType, City } from "@/types/domain";

export interface PropertySearchParams {
  transaction?: TransactionType;
  type?: PropertyType;
  city?: string;
  q?: string;
  bedroomsMin?: number;
  bathroomsMin?: number;
  garagesMin?: number;
  priceMin?: number;
  priceMax?: number;
  surfaceMin?: number;
  surfaceMax?: number;
  terrainMin?: number;
  terrainMax?: number;
  features?: string[];
  page?: number;
  pageSize?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "surface_desc";
}

export interface PropertySearchItem {
  id: number;
  title: string;
  slug: string;
  transaction: TransactionType;
  type: PropertyType;
  priceAmount: number;
  currency: "EUR";
  surfaceM2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  garage: number | null;
  city: Pick<City, "name" | "slug"> & { postalCode: string };
  coverImageUrl: string;
  dpeLabel: Property["dpeLabel"];
  status: Property["status"];
}

export interface PropertySearchResponse {
  page: number;
  pageSize: number;
  total: number;
  items: PropertySearchItem[];
}
