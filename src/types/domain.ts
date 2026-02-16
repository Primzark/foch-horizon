export type TransactionType = "vente" | "location";

export type PropertyType = "appartement" | "maison_villa" | "autre";

export type PropertyStatus = "active" | "under_offer" | "sold" | "rented" | "off_market";

export type EnergyLabel = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export interface City {
  id: string;
  name: string;
  slug: string;
  postalCodes: string[];
  isActive: boolean;
  heroImageUrl: string;
}

export interface Agent {
  id: string;
  fullName: string;
  role: string;
  phone: string;
  mobile: string;
  email: string;
  facebookUrl?: string;
  portraitUrl: string;
  bio: string;
  isActive: boolean;
  cityIds: string[];
}

export interface PropertyImage {
  id: string;
  propertyId: number;
  sourceUrl: string;
  sortOrder: number;
  altText: string;
}

export interface PropertyFeature {
  propertyId: number;
  featureKey: string;
  labelFr: string;
}

export interface Property {
  id: number;
  title: string;
  slug: string;
  transactionType: TransactionType;
  propertyType: PropertyType;
  status: PropertyStatus;
  priceAmount: number;
  priceCurrency: "EUR";
  surfaceM2: number;
  terrainM2: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingCount: number | null;
  garageCount: number | null;
  dpeLabel: EnergyLabel | null;
  dpeValue: number | null;
  gesLabel: EnergyLabel | null;
  gesValue: number | null;
  description: string;
  cityId: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
  agentId: string;
  publishedAt: string;
  updatedAt: string;
  isFeatured: boolean;
  images: PropertyImage[];
  features: PropertyFeature[];
}

export type LeadSource = "contact_page" | "property_page" | "estimation" | "favorites_share";

export interface LeadInput {
  source: LeadSource;
  propertyId?: number;
  cityId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
  consent: boolean;
  preferredDates?: string[];
  callbackWindow?: string;
  financingStatus?: "not_defined" | "cash" | "mortgage_in_progress" | "needs_financing";
}

export interface LeadRecord extends LeadInput {
  id: string;
  createdAt: string;
  status: "new" | "assigned" | "contacted" | "closed";
  assignedAgentId: string | null;
}
