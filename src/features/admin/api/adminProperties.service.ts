import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyStatus } from "@/types/domain";

export const ADMIN_PROPERTIES_QUERY_KEY = ["admin-properties"] as const;

export const ADMIN_PROPERTY_STATUS_OPTIONS: Array<{ value: PropertyStatus; label: string }> = [
  { value: "active", label: "Disponibles" },
  { value: "under_offer", label: "Sous offre" },
  { value: "reserved", label: "Réservé" },
  { value: "sold", label: "Vendu" },
  { value: "rented", label: "Loué" },
  { value: "off_market", label: "Retiré" },
];

export interface AdminProperty {
  id: number;
  title: string;
  slug: string;
  transaction_type: "vente" | "location";
  property_type: "appartement" | "maison_villa" | "autre";
  status: PropertyStatus;
  admin_status_override: PropertyStatus | null;
  price_amount: number;
  price_currency: string;
  surface_m2: number | null;
  bedrooms: number | null;
  postal_code: string | null;
  updated_at: string;
  city: { name: string; slug: string } | null;
  images: Array<{ source_url: string; sort_order: number }> | null;
}

export interface UpdatedAdminPropertyStatus {
  id: number;
  status: PropertyStatus;
  admin_status_override: PropertyStatus;
  updated_at: string;
}

export class AdminPropertiesError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AdminPropertiesError";
  }
}

async function invokeAdminProperties<T>(
  client: SupabaseClient,
  options: { method: "GET" | "PATCH"; body?: Record<string, unknown> },
): Promise<T> {
  const { data, error } = await client.functions.invoke<T>("admin-properties", options);
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

export async function updateAdminPropertyStatus(
  client: SupabaseClient,
  input: { id: number; status: PropertyStatus },
): Promise<UpdatedAdminPropertyStatus> {
  const response = await invokeAdminProperties<{ property: UpdatedAdminPropertyStatus }>(client, {
    method: "PATCH",
    body: input,
  });
  return response.property;
}
