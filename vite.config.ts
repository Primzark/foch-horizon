import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function createSupabaseFunctionProxy(
  target: string,
  rewrite: (requestPath: string) => string,
  anonKey?: string,
): ProxyOptions {
  const normalizedTarget = target.replace(/\/$/, "");
  const headers =
    anonKey && anonKey.trim().length > 0
      ? {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        }
      : undefined;

  return {
    target: normalizedTarget,
    changeOrigin: true,
    secure: true,
    rewrite,
    ...(headers ? { headers } : {}),
  };
}

function buildSupabaseApiProxy(env: Record<string, string>): Record<string, ProxyOptions> | undefined {
  const projectUrl = (env.VITE_SUPABASE_PROJECT_URL ?? "").trim();
  if (!projectUrl) {
    return undefined;
  }

  const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? env.EDGE_ANON_KEY ?? "").trim();

  return {
    "^/api/cities$": createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/cities-list",
      anonKey,
    ),
    "^/api/cities/[^/]+/properties$": createSupabaseFunctionProxy(
      projectUrl,
      (requestPath) => requestPath.replace(/^\/api\/cities\/([^/]+)\/properties$/, "/functions/v1/city-properties/$1"),
      anonKey,
    ),
    "^/api/cities/[^/]+$": createSupabaseFunctionProxy(
      projectUrl,
      (requestPath) => requestPath.replace(/^\/api\/cities\/([^/]+)$/, "/functions/v1/city-detail/$1"),
      anonKey,
    ),
    "^/api/properties/stats$": createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/properties-stats",
      anonKey,
    ),
    "^/api/properties/[^/]+$": createSupabaseFunctionProxy(
      projectUrl,
      (requestPath) => requestPath.replace(/^\/api\/properties\/([^/]+)$/, "/functions/v1/property-detail/$1"),
      anonKey,
    ),
    "^/api/properties$": createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/properties-search",
      anonKey,
    ),
    "^/api/leads$": createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/leads-create",
      anonKey,
    ),
    "^/api/google-reviews$": createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/google-reviews",
      anonKey,
    ),
    "^/api/chatbot-assistant$": createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/chatbot-assistant",
      anonKey,
    ),
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: buildSupabaseApiProxy(env),
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
