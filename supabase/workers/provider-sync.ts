/**
 * Provider sync worker scaffold.
 *
 * Intended schedules:
 * - Incremental sync: hourly
 * - Full sync: nightly
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

interface ProviderProperty {
  id: number;
  title: string;
  slug: string;
  transactionType: "vente" | "location";
  propertyType: "appartement" | "maison_villa" | "autre";
  status: "active" | "under_offer" | "sold" | "rented" | "off_market";
  priceAmount: number;
  surfaceM2: number;
  bedrooms?: number;
  bathrooms?: number;
  garageCount?: number;
  citySlug: string;
  postalCode: string;
  description: string;
  dpeLabel?: string;
  dpeValue?: number;
  gesLabel?: string;
  gesValue?: number;
  imageUrls: string[];
}

async function fetchProviderProperties(mode: "incremental" | "full"): Promise<ProviderProperty[]> {
  // TODO: replace with authenticated provider feed/API access.
  // Keep output normalized to ProviderProperty for stable ingestion contract.
  const _mode = mode;
  return [];
}

async function runSync(mode: "incremental" | "full") {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const providerProperties = await fetchProviderProperties(mode);

  // TODO: upsert cities first, then properties, features, and images.
  // Preserve property id as legacy reference id and mark missing records as off_market.

  const sourceIds = new Set(providerProperties.map((property) => property.id));

  if (sourceIds.size > 0) {
    await supabase.from("properties").update({ status: "off_market" }).not("id", "in", `(${Array.from(sourceIds).join(",")})`);
  }
}

if (import.meta.main) {
  const modeArg = (Deno.args[0] as "incremental" | "full" | undefined) ?? "incremental";
  runSync(modeArg).catch((error) => {
    console.error("sync_failed", error);
    Deno.exit(1);
  });
}
