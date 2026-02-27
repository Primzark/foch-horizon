import { defineConfig, loadEnv, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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

function routePattern(pathPattern: string): string {
  return `${pathPattern.replace(/\$$/, "")}(?:\\?.*)?$`;
}

function splitPathAndQuery(requestPath: string): { pathname: string; query: string } {
  const queryStart = requestPath.indexOf("?");
  if (queryStart < 0) {
    return { pathname: requestPath, query: "" };
  }

  return {
    pathname: requestPath.slice(0, queryStart),
    query: requestPath.slice(queryStart),
  };
}

function buildSupabaseApiProxy(env: Record<string, string>): Record<string, ProxyOptions> | undefined {
  const projectUrl = (env.VITE_SUPABASE_PROJECT_URL ?? "").trim();
  if (!projectUrl) {
    return undefined;
  }

  const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? env.EDGE_ANON_KEY ?? "").trim();

  return {
    [routePattern("^/api/cities$")]: createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/cities-list",
      anonKey,
    ),
    [routePattern("^/api/cities/[^/]+/properties$")]: createSupabaseFunctionProxy(
      projectUrl,
      (requestPath) => {
        const { pathname, query } = splitPathAndQuery(requestPath);
        return (
          pathname.replace(/^\/api\/cities\/([^/]+)\/properties$/, "/functions/v1/city-properties/$1") + query
        );
      },
      anonKey,
    ),
    [routePattern("^/api/cities/[^/]+$")]: createSupabaseFunctionProxy(
      projectUrl,
      (requestPath) => {
        const { pathname, query } = splitPathAndQuery(requestPath);
        return pathname.replace(/^\/api\/cities\/([^/]+)$/, "/functions/v1/city-detail/$1") + query;
      },
      anonKey,
    ),
    [routePattern("^/api/properties/stats$")]: createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/properties-stats",
      anonKey,
    ),
    [routePattern("^/api/properties/[^/]+$")]: createSupabaseFunctionProxy(
      projectUrl,
      (requestPath) => {
        const { pathname, query } = splitPathAndQuery(requestPath);
        return pathname.replace(/^\/api\/properties\/([^/]+)$/, "/functions/v1/property-detail/$1") + query;
      },
      anonKey,
    ),
    [routePattern("^/api/properties$")]: createSupabaseFunctionProxy(
      projectUrl,
      (requestPath) => {
        const { query } = splitPathAndQuery(requestPath);
        return `/functions/v1/properties-search${query}`;
      },
      anonKey,
    ),
    [routePattern("^/api/leads$")]: createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/leads-create",
      anonKey,
    ),
    [routePattern("^/api/google-reviews$")]: createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/google-reviews",
      anonKey,
    ),
    [routePattern("^/api/chatbot-assistant$")]: createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/chatbot-assistant",
      anonKey,
    ),
    [routePattern("^/api/chatbot-assistant-stream$")]: createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/chatbot-assistant-stream",
      anonKey,
    ),
    [routePattern("^/api/chatbot-feedback$")]: createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/chatbot-feedback",
      anonKey,
    ),
    [routePattern("^/api/chatbot-memory/reset$")]: createSupabaseFunctionProxy(
      projectUrl,
      () => "/functions/v1/chatbot-memory-reset",
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
      allowedHosts: [".trycloudflare.com"],
      hmr: {
        overlay: false,
      },
      proxy: buildSupabaseApiProxy(env),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
