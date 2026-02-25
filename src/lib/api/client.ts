export type ApiMode = "mock" | "edge";

const rawMode = (import.meta.env.VITE_API_MODE as string | undefined)?.toLowerCase();
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function shouldUseSameOriginProxy(configuredUrl: string): boolean {
  if (!configuredUrl) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    const baseUrl = new URL(configuredUrl, window.location.origin);
    const pageUrl = new URL(window.location.href);

    const pageIsTunnel = pageUrl.hostname.endsWith(".trycloudflare.com");
    const baseIsLocal = isLocalHostname(baseUrl.hostname);
    const mixedContentLocal = pageUrl.protocol === "https:" && baseUrl.protocol === "http:" && baseIsLocal;

    return pageIsTunnel && baseIsLocal || mixedContentLocal;
  } catch {
    return false;
  }
}

export const apiMode: ApiMode = rawMode === "edge" ? "edge" : "mock";
export const apiBaseUrl = shouldUseSameOriginProxy(configuredBaseUrl) ? "" : configuredBaseUrl;

export function isEdgeApiEnabled(): boolean {
  return apiMode === "edge";
}

export function isEdgeApiAuthHeadersEnabled(): boolean {
  return isEdgeApiEnabled() && supabaseAnonKey.length > 0;
}

function resolveApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

export function buildEdgeApiHeaders(headers?: HeadersInit, options?: { json?: boolean }): Headers {
  const mergedHeaders = new Headers(headers);

  if (options?.json && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  if (isEdgeApiAuthHeadersEnabled()) {
    if (!mergedHeaders.has("apikey")) {
      mergedHeaders.set("apikey", supabaseAnonKey);
    }
    if (!mergedHeaders.has("Authorization")) {
      mergedHeaders.set("Authorization", `Bearer ${supabaseAnonKey}`);
    }
  }

  return mergedHeaders;
}

export async function edgeApiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!isEdgeApiEnabled()) {
    throw new Error("Edge API mode is disabled.");
  }

  return fetch(resolveApiUrl(path), {
    ...init,
    headers: buildEdgeApiHeaders(init?.headers),
  });
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isEdgeApiEnabled()) {
    throw new Error("Edge API mode is disabled.");
  }

  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers: buildEdgeApiHeaders(init?.headers, { json: true }),
  });

  if (!response.ok) {
    const fallbackError = `API request failed: ${response.status}`;
    const responseBody = await response.json().catch(() => null);
    throw new Error((responseBody as { error?: string } | null)?.error ?? fallbackError);
  }

  return (await response.json()) as T;
}
