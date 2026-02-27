import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseProjectUrl = (import.meta.env.VITE_SUPABASE_PROJECT_URL as string | undefined)?.trim() ?? "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

let browserSupabaseClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (!supabaseProjectUrl || !supabaseAnonKey) {
    return null;
  }

  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient(supabaseProjectUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }

  return browserSupabaseClient;
}
