export type ApiMode = "mock" | "edge";

const rawMode = (import.meta.env.VITE_API_MODE as string | undefined)?.toLowerCase();
const normalizedBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const normalizedSupabaseProjectUrl = (import.meta.env.VITE_SUPABASE_PROJECT_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

export const apiMode: ApiMode = rawMode === "edge" ? "edge" : "mock";
export const apiBaseUrl = normalizedBaseUrl;
export const supabaseProjectUrl = normalizedSupabaseProjectUrl;

function splitPathAndSearch(path: string): { pathname: string; search: string } {
  const queryIndex = path.indexOf("?");
  if (queryIndex === -1) {
    return { pathname: path, search: "" };
  }
  return {
    pathname: path.slice(0, queryIndex),
    search: path.slice(queryIndex),
  };
}

function rewriteApiPathToSupabaseFunction(path: string): string | null {
  const { pathname, search } = splitPathAndSearch(path);

  if (pathname === "/api/cities") return `/functions/v1/cities-list${search}`;
  if (pathname === "/api/properties/stats") return `/functions/v1/properties-stats${search}`;
  if (pathname === "/api/properties") return `/functions/v1/properties-search${search}`;
  if (pathname === "/api/leads") return `/functions/v1/leads-create${search}`;
  if (pathname === "/api/google-reviews") return `/functions/v1/google-reviews${search}`;
  if (pathname === "/api/chatbot-assistant") return `/functions/v1/chatbot-assistant${search}`;
  if (pathname === "/api/chatbot-assistant-stream") return `/functions/v1/chatbot-assistant-stream${search}`;
  if (pathname === "/api/chatbot-feedback") return `/functions/v1/chatbot-feedback${search}`;
  if (pathname === "/api/chatbot-memory/reset") return `/functions/v1/chatbot-memory-reset${search}`;

  let match = pathname.match(/^\/api\/cities\/([^/]+)\/properties$/);
  if (match) return `/functions/v1/city-properties/${match[1]}${search}`;

  match = pathname.match(/^\/api\/cities\/([^/]+)$/);
  if (match) return `/functions/v1/city-detail/${match[1]}${search}`;

  match = pathname.match(/^\/api\/properties\/([^/]+)$/);
  if (match) return `/functions/v1/property-detail/${match[1]}${search}`;

  return null;
}

function shouldUseDirectSupabaseFunctions(path: string): boolean {
  if (apiMode !== "edge" || !supabaseProjectUrl) return false;
  if (!path.startsWith("/api/")) return false;
  if (apiBaseUrl.length === 0) return true;
  return apiBaseUrl === supabaseProjectUrl;
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (shouldUseDirectSupabaseFunctions(path)) {
    const rewrittenPath = rewriteApiPathToSupabaseFunction(path);
    if (rewrittenPath) {
      return `${supabaseProjectUrl}${rewrittenPath}`;
    }
  }

  if (apiBaseUrl.length > 0) {
    return `${apiBaseUrl}${path}`;
  }

  return path;
}

export function isDirectSupabaseFunctionUrl(url: string): boolean {
  if (!supabaseProjectUrl) return false;
  return url.startsWith(`${supabaseProjectUrl}/functions/v1/`);
}

export function buildEdgeApiHeaders(headers?: HeadersInit): Headers {
  const mergedHeaders = new Headers(headers ?? undefined);
  if (supabaseAnonKey) {
    mergedHeaders.set("apikey", supabaseAnonKey);
    mergedHeaders.set("Authorization", `Bearer ${supabaseAnonKey}`);
  }
  return mergedHeaders;
}

export function isEdgeApiEnabled(): boolean {
  return apiMode === "edge" && (apiBaseUrl.length > 0 || supabaseProjectUrl.length > 0);
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isEdgeApiEnabled()) {
    throw new Error("Edge API mode is disabled.");
  }

  const url = resolveApiUrl(path);
  const headers = new Headers(init?.headers ?? undefined);
  headers.set("Content-Type", "application/json");
  if (isDirectSupabaseFunctionUrl(url)) {
    const authHeaders = buildEdgeApiHeaders(headers);
    authHeaders.forEach((value, key) => headers.set(key, value));
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const fallbackError = `API request failed: ${response.status}`;
    const responseBody = await response.json().catch(() => null);
    throw new Error((responseBody as { error?: string } | null)?.error ?? fallbackError);
  }

  return (await response.json()) as T;
}
