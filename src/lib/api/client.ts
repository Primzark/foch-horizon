export type ApiMode = "mock" | "edge";

const rawMode = (import.meta.env.VITE_API_MODE as string | undefined)?.toLowerCase();
const normalizedBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export const apiMode: ApiMode = rawMode === "edge" ? "edge" : "mock";
export const apiBaseUrl = normalizedBaseUrl;

export function isEdgeApiEnabled(): boolean {
  return apiMode === "edge" && apiBaseUrl.length > 0;
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
