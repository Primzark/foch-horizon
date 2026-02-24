export type ApiMode = "mock" | "edge";

const rawMode = (import.meta.env.VITE_API_MODE as string | undefined)?.toLowerCase();
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

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

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isEdgeApiEnabled()) {
    throw new Error("Edge API mode is disabled.");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const fallbackError = `API request failed: ${response.status}`;
    const responseBody = await response.json().catch(() => null);
    throw new Error((responseBody as { error?: string } | null)?.error ?? fallbackError);
  }

  return (await response.json()) as T;
}
