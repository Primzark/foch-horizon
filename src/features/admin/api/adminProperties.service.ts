import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyStatus, PropertyType } from "@/types/domain";

export type AdminManagedPropertyStatus = Exclude<PropertyStatus, "rented">;

export const ADMIN_PROPERTIES_QUERY_KEY = ["admin-properties"] as const;

export const ADMIN_PROPERTY_STATUS_OPTIONS: Array<{ value: AdminManagedPropertyStatus; label: string }> = [
  { value: "new", label: "Nouveauté" },
  { value: "exclusive", label: "Exclusivité" },
  { value: "price_reduced", label: "Prix réduit" },
  { value: "under_offer", label: "Sous offre" },
  { value: "under_contract", label: "Sous compromis" },
  { value: "sold", label: "Vendu" },
  { value: "active", label: "Disponible" },
  { value: "reserved", label: "Réservé" },
  { value: "off_market", label: "Retiré" },
];

export const ADMIN_AGENTS_QUERY_KEY = ["admin-agents"] as const;

export interface AdminProperty {
  id: number;
  title: string;
  slug: string;
  transaction_type: "vente";
  property_type: "appartement" | "maison_villa" | "autre";
  status: AdminManagedPropertyStatus;
  admin_status_override: AdminManagedPropertyStatus | null;
  is_featured: boolean;
  is_online: boolean;
  agent_id: string | null;
  price_amount: number;
  price_currency: string;
  surface_m2: number | null;
  bedrooms: number | null;
  postal_code: string | null;
  updated_at: string;
  city: { name: string; slug: string } | null;
  images: Array<{ source_url: string; sort_order: number }> | null;
}

export interface AdminAgent {
  id: string;
  full_name: string;
  role: string;
}

export interface UpdatedAdminProperty {
  id: number;
  status: AdminManagedPropertyStatus;
  admin_status_override: AdminManagedPropertyStatus | null;
  is_featured: boolean;
  is_online: boolean;
  agent_id: string | null;
  updated_at: string;
}

export interface AdminPropertyUpdateInput {
  id: number;
  status?: AdminManagedPropertyStatus;
  isFeatured?: boolean;
  isOnline?: boolean;
  agentId?: string | null;
}

export interface AdminPropertyLikeSummary {
  property_id: number;
  property_type: PropertyType;
  like_count: number;
  latest_liked_at: string;
}

export interface AdminPropertyLikeEvent {
  id: string;
  property_id: number;
  property_type: PropertyType;
  visitor_id: string;
  action: "like" | "unlike";
  occurred_at: string;
}

export const ADMIN_PROPERTY_LIKES_QUERY_KEY = ["admin-property-likes"] as const;
export const ADMIN_PROPERTY_LIKE_HISTORY_QUERY_KEY = ["admin-property-like-history"] as const;

export class AdminPropertiesError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AdminPropertiesError";
  }
}

async function invokeAdminProperties<T>(
  client: SupabaseClient,
  options: { method: "GET" | "PATCH"; body?: Record<string, unknown>; query?: Record<string, string> },
): Promise<T> {
  const query = new URLSearchParams(options.query ?? {}).toString();
  const functionName = query ? `admin-properties?${query}` : "admin-properties";
  const invokeOptions = {
    method: options.method,
    ...(options.body ? { body: options.body } : {}),
  };
  const { data, error } = await client.functions.invoke<T>(functionName, invokeOptions);
  if (error) {
    const response = (error as { context?: Response }).context;
    let message = error.message;

    if (response) {
      const payload = await response.clone().json().catch(() => null) as { error?: unknown } | null;
      if (typeof payload?.error === "string") message = payload.error;
    }

    throw new AdminPropertiesError(message, response?.status);
  }

  if (data == null) throw new AdminPropertiesError("The property service returned an empty response.");
  return data;
}

export async function getAdminProperties(client: SupabaseClient): Promise<AdminProperty[]> {
  const response = await invokeAdminProperties<{ properties: AdminProperty[] }>(client, { method: "GET" });
  return response.properties;
}

export async function getAdminAgents(client: SupabaseClient): Promise<AdminAgent[]> {
  const response = await invokeAdminProperties<{ agents: AdminAgent[] }>(client, {
    method: "GET",
    query: { view: "agents" },
  });
  return response.agents;
}

export async function getAdminPropertyLikeSummary(client: SupabaseClient): Promise<AdminPropertyLikeSummary[]> {
  const response = await invokeAdminProperties<{ likes: AdminPropertyLikeSummary[] }>(client, {
    method: "GET",
    query: { view: "likes-summary" },
  });
  return response.likes;
}

export async function getAdminPropertyLikeHistory(
  client: SupabaseClient,
  propertyId: number,
): Promise<AdminPropertyLikeEvent[]> {
  const response = await invokeAdminProperties<{ events: AdminPropertyLikeEvent[] }>(client, {
    method: "GET",
    query: { view: "likes-history", propertyId: String(propertyId) },
  });
  return response.events;
}

export async function updateAdminProperty(
  client: SupabaseClient,
  input: AdminPropertyUpdateInput,
): Promise<UpdatedAdminProperty> {
  const response = await invokeAdminProperties<{ property: UpdatedAdminProperty }>(client, {
    method: "PATCH",
    body: { ...input },
  });
  return response.property;
}
