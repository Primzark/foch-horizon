import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

const VISITOR_ID_KEY = "foch_visitor_id";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const propertyQueues = new Map<number, Promise<void>>();
let inMemoryVisitorId: string | null = null;

function createUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A random browser-scoped ID keeps repeated likes from one visitor unique. */
export function getPropertyVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  if (inMemoryVisitorId) return inMemoryVisitorId;

  try {
    const storedId = window.localStorage.getItem(VISITOR_ID_KEY);
    if (storedId && uuidPattern.test(storedId)) {
      inMemoryVisitorId = storedId;
      return storedId;
    }

    const newId = createUuid();
    window.localStorage.setItem(VISITOR_ID_KEY, newId);
    inMemoryVisitorId = newId;
    return newId;
  } catch {
    inMemoryVisitorId = createUuid();
    return inMemoryVisitorId;
  }
}

async function sendLikeState(propertyId: number, visitorId: string, liked: boolean): Promise<void> {
  const client = getBrowserSupabaseClient();
  if (!client) return;

  const { data, error } = await client.functions.invoke<{ ok?: boolean; error?: string }>("property-likes", {
    body: { propertyId, visitorId, liked },
  });

  if (error) {
    const response = (error as { context?: Response }).context;
    const payload = response
      ? await response.clone().json().catch(() => null) as { error?: unknown } | null
      : null;
    throw new Error(typeof payload?.error === "string" ? payload.error : error.message);
  }

  if (!data?.ok) throw new Error(data?.error ?? "Could not save this like.");
}

/** Serialize state changes per property so a quick like/unlike ends in the latest state. */
export function persistPropertyLike(propertyId: number, liked: boolean): Promise<void> {
  const visitorId = getPropertyVisitorId();
  if (!visitorId) return Promise.resolve();

  const previous = propertyQueues.get(propertyId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => sendLikeState(propertyId, visitorId, liked));
  propertyQueues.set(propertyId, next);

  void next.finally(() => {
    if (propertyQueues.get(propertyId) === next) propertyQueues.delete(propertyId);
  }).catch(() => undefined);

  return next;
}
