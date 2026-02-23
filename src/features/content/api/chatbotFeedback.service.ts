import { apiBaseUrl, isEdgeApiEnabled } from "@/lib/api/client";

export type ChatbotTelemetryEventType =
  | "reply_received"
  | "feedback_submitted"
  | "citation_clicked"
  | "request_failed"
  | "chatbot_opened"
  | "chatbot_reset"
  | "chatbot_message_sent"
  | "tool_action_rendered"
  | "tool_action_clicked"
  | "tool_orchestration_result"
  | "tool_compare_requested"
  | "tool_handoff_prefill_opened";

export interface ChatbotTelemetryEvent {
  eventId: string;
  eventType: ChatbotTelemetryEventType;
  sessionId: string;
  conversationId: string;
  messageId?: string;
  requestId?: string;
  pagePath?: string;
  source?: "local" | "edge" | "fallback";
  edgeProvider?: "gemini" | "openai" | "fallback";
  routeDecision?: string;
  routeCategory?: "deterministic_local" | "edge_rag" | "edge_general" | "edge_tools" | "fallback";
  intent?: string;
  ragUsed?: boolean;
  retrievalMode?: "none" | "vector" | "keyword" | "hybrid";
  citationsCount?: number;
  citationPath?: string;
  responseLatencyMs?: number;
  requestChars?: number;
  answerChars?: number;
  feedbackValue?: 1 | -1;
  feedbackReason?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatbotTelemetryBatchRequest {
  events: ChatbotTelemetryEvent[];
}

const MAX_BATCH_SIZE = 5;
const MAX_QUEUE_SIZE = 50;
const FLUSH_DEBOUNCE_MS = 2000;
const DEDUPE_WINDOW_MS = 60_000;

let queue: ChatbotTelemetryEvent[] = [];
let flushTimer: number | null = null;
let inFlight = false;
const recentEventIds = new Map<string, number>();
let visibilityHookInstalled = false;

function nowMs(): number {
  return Date.now();
}

function cleanupRecentEventIds(): void {
  const cutoff = nowMs() - DEDUPE_WINDOW_MS;
  for (const [eventId, timestamp] of recentEventIds.entries()) {
    if (timestamp < cutoff) {
      recentEventIds.delete(eventId);
    }
  }
}

function shouldAcceptEvent(event: ChatbotTelemetryEvent): boolean {
  if (!event || typeof event !== "object") return false;
  if (typeof event.eventId !== "string" || event.eventId.trim().length === 0) return false;
  if (typeof event.eventType !== "string" || event.eventType.trim().length === 0) return false;
  if (typeof event.sessionId !== "string" || event.sessionId.trim().length === 0) return false;
  if (typeof event.conversationId !== "string" || event.conversationId.trim().length === 0) return false;
  cleanupRecentEventIds();
  if (recentEventIds.has(event.eventId)) return false;
  recentEventIds.set(event.eventId, nowMs());
  return true;
}

function clampInt(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizeTelemetryEvent(event: ChatbotTelemetryEvent): ChatbotTelemetryEvent {
  return {
    eventId: event.eventId.trim().slice(0, 120),
    eventType: event.eventType,
    sessionId: event.sessionId.trim().slice(0, 120),
    conversationId: event.conversationId.trim().slice(0, 120),
    messageId: typeof event.messageId === "string" ? event.messageId.trim().slice(0, 120) : undefined,
    requestId: typeof event.requestId === "string" ? event.requestId.trim().slice(0, 120) : undefined,
    pagePath: typeof event.pagePath === "string" ? event.pagePath.trim().slice(0, 500) : undefined,
    source: event.source,
    edgeProvider: event.edgeProvider,
    routeDecision: typeof event.routeDecision === "string" ? event.routeDecision.trim().slice(0, 120) : undefined,
    routeCategory: event.routeCategory,
    intent: typeof event.intent === "string" ? event.intent.trim().slice(0, 80) : undefined,
    ragUsed: typeof event.ragUsed === "boolean" ? event.ragUsed : undefined,
    retrievalMode: event.retrievalMode,
    citationsCount: clampInt(event.citationsCount, 0, 50),
    citationPath: typeof event.citationPath === "string" ? event.citationPath.trim().slice(0, 500) : undefined,
    responseLatencyMs: clampInt(event.responseLatencyMs, 0, 120_000),
    requestChars: clampInt(event.requestChars, 0, 10_000),
    answerChars: clampInt(event.answerChars, 0, 20_000),
    feedbackValue: event.feedbackValue,
    feedbackReason: typeof event.feedbackReason === "string" ? event.feedbackReason.trim().slice(0, 160) : undefined,
    metadata: event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata : undefined,
  };
}

function endpointUrl(): string {
  const path = "/api/chatbot-feedback";
  return isEdgeApiEnabled() && apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

function clearScheduledFlush(): void {
  if (flushTimer != null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
}

async function postBatch(payload: ChatbotTelemetryBatchRequest): Promise<void> {
  if (payload.events.length === 0) return;
  await fetch(endpointUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  });
}

function trySendBeacon(events: ChatbotTelemetryEvent[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function" || events.length === 0) {
    return false;
  }
  try {
    const body = JSON.stringify({ events });
    const blob = new Blob([body], { type: "application/json" });
    return navigator.sendBeacon(endpointUrl(), blob);
  } catch {
    return false;
  }
}

function installVisibilityFlush(): void {
  if (visibilityHookInstalled || typeof document === "undefined") return;
  visibilityHookInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;
    if (queue.length === 0) return;
    const batch = queue.splice(0, Math.min(queue.length, MAX_BATCH_SIZE));
    clearScheduledFlush();
    if (!trySendBeacon(batch)) {
      void postBatch({ events: batch }).catch(() => undefined);
    }
  });
}

export function queueChatbotTelemetryEvent(event: ChatbotTelemetryEvent): void {
  if (typeof window === "undefined") return;
  if (!shouldAcceptEvent(event)) return;

  installVisibilityFlush();

  queue.push(normalizeTelemetryEvent(event));
  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(-MAX_QUEUE_SIZE);
  }

  if (queue.length >= MAX_BATCH_SIZE) {
    void flushChatbotTelemetryQueue();
    return;
  }

  if (flushTimer == null) {
    flushTimer = window.setTimeout(() => {
      void flushChatbotTelemetryQueue();
    }, FLUSH_DEBOUNCE_MS);
  }
}

export async function flushChatbotTelemetryQueue(): Promise<void> {
  if (typeof window === "undefined") return;
  if (inFlight || queue.length === 0) {
    clearScheduledFlush();
    return;
  }

  clearScheduledFlush();
  inFlight = true;
  const batch = queue.splice(0, Math.min(queue.length, MAX_BATCH_SIZE));
  try {
    await postBatch({ events: batch });
  } catch {
    // Drop failures silently to avoid affecting chat UX.
  } finally {
    inFlight = false;
    if (queue.length > 0) {
      if (queue.length >= MAX_BATCH_SIZE) {
        void flushChatbotTelemetryQueue();
      } else if (flushTimer == null) {
        flushTimer = window.setTimeout(() => {
          void flushChatbotTelemetryQueue();
        }, FLUSH_DEBOUNCE_MS);
      }
    }
  }
}
