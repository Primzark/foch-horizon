import { FormEvent, Fragment, MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BotMessageSquare, Mail, RotateCcw, Send, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  askAgencyChatbot,
  type ChatbotActionRequest,
  type ChatbotCitation,
  type ChatbotConversationState,
  type ChatbotPlannerMeta,
  type ChatbotToolTrace,
  type ChatbotUiAction,
  chatbotExamplePrompts,
  type ChatbotPropertySuggestion,
  type ChatbotReply,
  type ToolSearchParams,
} from "@/features/content/api/chatbot.service";
import { flushChatbotTelemetryQueue, queueChatbotTelemetryEvent } from "@/features/content/api/chatbotFeedback.service";
import { submitLead } from "@/features/leads/api/leads.service";
import { trackEvent } from "@/lib/analytics/events";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  propertySuggestions?: ChatbotPropertySuggestion[];
  citations?: ChatbotCitation[];
  suggestedPrompts?: string[];
  source?: "local" | "edge";
  edgeProvider?: "gemini" | "openai" | "fallback";
  ragUsed?: boolean;
  retrievalMode?: "none" | "vector" | "keyword" | "hybrid";
  routeDecision?: string;
  routeCategory?: "deterministic_local" | "edge_rag" | "edge_general" | "edge_tools" | "fallback";
  requestId?: string;
  agentMode?: "tool" | "rag" | "fallback";
  actions?: ChatbotUiAction[];
  toolTrace?: ChatbotToolTrace[];
  planner?: ChatbotPlannerMeta;
  latencyMs?: number;
  feedback?: {
    value: 1 | -1;
    reason?: string;
    submittedAt: number;
  };
}

interface OpeningGreetingVariant {
  content: string;
  prompts: string[];
}

function GeminiLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn("h-3.5 w-3.5", className)}
    >
      <defs>
        <linearGradient id="gemini-chatbot-logo-gradient" x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1A73E8" />
          <stop offset="0.48" stopColor="#8E63FF" />
          <stop offset="1" stopColor="#34A853" />
        </linearGradient>
      </defs>
      <path
        fill="url(#gemini-chatbot-logo-gradient)"
        d="M12 2.5c.39 3.7 1.2 5.41 2.3 6.57 1.16 1.1 2.87 1.91 6.57 2.3-3.7.39-5.41 1.2-6.57 2.3-1.1 1.16-1.91 2.87-2.3 6.57-.39-3.7-1.2-5.41-2.3-6.57-1.16-1.1-2.87-1.91-6.57-2.3 3.7-.39 5.41-1.2 6.57-2.3 1.1-1.16 1.91-2.87 2.3-6.57Z"
      />
    </svg>
  );
}

const initialMessage: ChatMessage = {
  id: "init-assistant",
  role: "assistant",
  content:
    "Bonjour 👋 Je suis l'assistant immobilier Foch. Je peux vous guider sur les biens, les quartiers du Havre, nos services et les étapes clés de votre projet.",
  suggestedPrompts: chatbotExamplePrompts,
};

const openingGreetingVariants: OpeningGreetingVariant[] = [
  {
    content: "Bonjour 👋 Sur quoi avancez-vous aujourd'hui: achat, vente, location ou estimation ?",
    prompts: [
      "Je cherche un appartement à vendre au Havre",
      "Je veux vendre mon bien",
      "Montrez-moi les avis clients",
      "Je veux une estimation",
    ],
  },
  {
    content: "Ravi de vous revoir 😊 Quel est votre objectif immobilier du moment ?",
    prompts: [
      "Je cherche une maison familiale à Sanvic",
      "Quels services proposez-vous ?",
      "Comment se passe un compromis de vente ?",
      "Je veux contacter l'agence",
    ],
  },
  {
    content: "Bonjour ✨ Dites-moi votre projet et je vous guide vers la bonne page du site.",
    prompts: [
      "Ouvrir /biens",
      "Ouvrir /histoire-immobilier-le-havre",
      "Ouvrir /avis",
      "Ouvrir /contact",
    ],
  },
  {
    content: "Bonjour 🙂 Vous recherchez plutôt un bien, une information de quartier ou une aide sur les étapes ?",
    prompts: [
      "Quel quartier du Havre est le plus adapté pour un investissement locatif ?",
      "Je cherche un T3 avec balcon",
      "Où trouver les honoraires ?",
      "Je ne trouve pas de bien adapté",
    ],
  },
  {
    content: "Bonjour 🤝 Je peux vous orienter rapidement: annonces, avis, histoire locale, estimation, contact.",
    prompts: [
      "Voir toutes les annonces",
      "Résumer les avis clients",
      "Je veux estimer mon bien",
      "Je veux parler à un conseiller",
    ],
  },
];

const CHATBOT_STORAGE_KEY = "foch_chatbot_messages_v1";
const CHATBOT_STORAGE_VERSION = 2;
const CHATBOT_STATE_STORAGE_KEY = "foch_chatbot_state_v1";
const CHATBOT_SESSION_STORAGE_KEY = "foch_chatbot_session_id_v1";
const CHATBOT_REQUEST_TIMEOUT_MS = 18000;
const CHATBOT_HARD_UNLOCK_MS = 32000;
const CHATBOT_MEMORY_LIMIT = 44;
const CHATBOT_HISTORY_LIMIT = 24;
const CHATBOT_HISTORY_CHAR_LIMIT = 12000;
const CHATBOT_HISTORY_MIN_KEEP = 8;
const CHATBOT_HISTORY_MESSAGE_LIMIT = 1400;
const CHATBOT_MIN_REPLY_DELAY_MS = 900;
const CHATBOT_MAX_REPLY_DELAY_MS = 2600;

const internalPathSplitPattern = /(\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?)/gi;
const internalPathMatchPattern = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?$/i;
const chatbotFeedbackReasonOptions = [
  "Hors sujet",
  "Source/lien incorrect",
  "Réponse incomplète",
  "Je voulais des biens",
  "Trop lent",
] as const;

function createMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `chat-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function readOrCreateChatbotSessionId(): string {
  if (typeof window === "undefined") {
    return createMessageId();
  }

  try {
    const existing = window.localStorage.getItem(CHATBOT_SESSION_STORAGE_KEY);
    if (existing && existing.trim().length > 0) {
      return existing.trim();
    }
    const next = createMessageId();
    window.localStorage.setItem(CHATBOT_SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return createMessageId();
  }
}

function createTelemetryEventId(): string {
  return `evt-${createMessageId()}`;
}

function normalizePromptList(prompts: string[]): string[] {
  return prompts.map((prompt) => prompt.trim()).filter((prompt) => prompt.length > 0).slice(0, 6);
}

function normalizeForHistory(content: string): string {
  return content
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const openingGreetingSignatures = new Set<string>([
  normalizeForHistory(initialMessage.content),
  ...openingGreetingVariants.map((variant) => normalizeForHistory(variant.content)),
]);

function isOpeningGreetingMessage(message: ChatMessage): boolean {
  if (message.role !== "assistant") return false;
  return openingGreetingSignatures.has(normalizeForHistory(message.content));
}

function compactMessageContent(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, CHATBOT_HISTORY_MESSAGE_LIMIT);
}

function buildChatHistoryPayload(
  messages: ChatMessage[],
  userInput: string,
): Array<{ role: "assistant" | "user"; content: string }> {
  const history = messages
    .filter((message) => !isOpeningGreetingMessage(message))
    .map((message) => ({
      role: message.role,
      content: compactMessageContent(message.content),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-CHATBOT_HISTORY_LIMIT);

  const payload = [...history, { role: "user" as const, content: compactMessageContent(userInput) }];
  let totalCharacters = payload.reduce((total, message) => total + message.content.length, 0);

  while (totalCharacters > CHATBOT_HISTORY_CHAR_LIMIT && payload.length > CHATBOT_HISTORY_MIN_KEEP) {
    const removed = payload.shift();
    totalCharacters -= removed?.content.length ?? 0;
  }

  return payload.slice(-CHATBOT_HISTORY_LIMIT);
}

function buildOpeningGreetingMessage(index: number): ChatMessage {
  const variant = openingGreetingVariants[(index - 1) % openingGreetingVariants.length];
  const offset = (index - 1) % variant.prompts.length;
  const rotatedPrompts = [...variant.prompts.slice(offset), ...variant.prompts.slice(0, offset)];

  return {
    id: createMessageId(),
    role: "assistant",
    content: variant.content,
    suggestedPrompts: normalizePromptList(rotatedPrompts),
  };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeReplyDelayMs(question: string): number {
  const normalizedLength = clampNumber(question.trim().length, 12, 260);
  const dynamicDelay = 520 + normalizedLength * 8;
  return clampNumber(dynamicDelay, CHATBOT_MIN_REPLY_DELAY_MS, CHATBOT_MAX_REPLY_DELAY_MS);
}

function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-CHATBOT_MEMORY_LIMIT);
}

function sanitizePromptList(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const prompts = raw
    .filter((value): value is string => typeof value === "string")
    .map((prompt) => prompt.trim())
    .filter((prompt) => prompt.length > 0)
    .slice(0, 6);

  return prompts.length > 0 ? prompts : undefined;
}

function sanitizePropertySuggestions(raw: unknown): ChatbotPropertySuggestion[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const suggestions = raw
    .filter((value): value is ChatbotPropertySuggestion => {
      if (!value || typeof value !== "object") return false;

      const candidate = value as Partial<ChatbotPropertySuggestion>;
      return (
        typeof candidate.id === "number" &&
        typeof candidate.title === "string" &&
        typeof candidate.city === "string" &&
        typeof candidate.price === "string" &&
        typeof candidate.path === "string"
      );
    })
    .slice(0, 3);

  return suggestions.length > 0 ? suggestions : undefined;
}

function sanitizeCitations(raw: unknown): ChatbotCitation[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const citations = raw
    .filter((value): value is ChatbotCitation => {
      if (!value || typeof value !== "object") return false;
      const candidate = value as Partial<ChatbotCitation>;
      return typeof candidate.path === "string";
    })
    .map((citation) => ({
      path: citation.path.trim(),
      title: typeof citation.title === "string" ? citation.title.trim() : undefined,
      sourceUrl: typeof citation.sourceUrl === "string" ? citation.sourceUrl.trim() : undefined,
      similarity: typeof citation.similarity === "number" ? citation.similarity : undefined,
    }))
    .filter((citation) => citation.path.length > 0)
    .slice(0, 4);

  return citations.length > 0 ? citations : undefined;
}

function sanitizeFeedback(raw: unknown): ChatMessage["feedback"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = raw as { value?: unknown; reason?: unknown; submittedAt?: unknown };
  const value = candidate.value === 1 || candidate.value === -1 ? candidate.value : null;
  if (value == null) return undefined;
  const reason =
    typeof candidate.reason === "string" && candidate.reason.trim().length > 0
      ? candidate.reason.trim().slice(0, 160)
      : undefined;
  const submittedAt =
    typeof candidate.submittedAt === "number" && Number.isFinite(candidate.submittedAt) && candidate.submittedAt > 0
      ? Math.floor(candidate.submittedAt)
      : Date.now();
  return { value, reason, submittedAt };
}

function sanitizePlannerMeta(raw: unknown): ChatbotPlannerMeta | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = raw as Record<string, unknown>;
  const provider = candidate.provider === "gemini" || candidate.provider === "fallback" ? candidate.provider : null;
  const mode =
    candidate.mode === "disabled" || candidate.mode === "gemini" || candidate.mode === "deterministic_fallback"
      ? candidate.mode
      : null;
  const decisionType =
    candidate.decisionType === "tool_call" || candidate.decisionType === "clarify" || candidate.decisionType === "none"
      ? candidate.decisionType
      : null;

  if (!provider || !mode || !decisionType) return undefined;

  return {
    provider,
    mode,
    decisionType,
    toolName:
      candidate.toolName === "search_properties" ||
      candidate.toolName === "compare_properties" ||
      candidate.toolName === "prepare_handoff"
        ? candidate.toolName
        : undefined,
    reasonCode:
      typeof candidate.reasonCode === "string" && candidate.reasonCode.trim().length > 0
        ? candidate.reasonCode.trim().slice(0, 80)
        : undefined,
    confidence:
      typeof candidate.confidence === "number" && Number.isFinite(candidate.confidence)
        ? clampNumber(candidate.confidence, 0, 1)
        : undefined,
  };
}

function plannerTelemetryMetadata(planner?: ChatbotPlannerMeta): Record<string, unknown> | undefined {
  if (!planner) return undefined;
  return {
    plannerMode: planner.mode,
    plannerDecisionType: planner.decisionType,
    plannerToolName: planner.toolName,
    plannerReasonCode: planner.reasonCode,
    plannerConfidence: planner.confidence,
    plannerFallback: planner.mode === "deterministic_fallback",
  };
}

function mergeTelemetryMetadata(
  base: Record<string, unknown> | undefined,
  planner?: ChatbotPlannerMeta,
): Record<string, unknown> | undefined {
  const plannerMeta = plannerTelemetryMetadata(planner);
  if (!base && !plannerMeta) return undefined;
  return {
    ...(base ?? {}),
    ...(plannerMeta ?? {}),
  };
}

function sanitizeStoredMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) {
    return [initialMessage];
  }

  const sanitized: ChatMessage[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const candidate = item as {
      id?: unknown;
      role?: unknown;
      content?: unknown;
      propertySuggestions?: unknown;
      citations?: unknown;
      suggestedPrompts?: unknown;
      source?: unknown;
      edgeProvider?: unknown;
      ragUsed?: unknown;
      retrievalMode?: unknown;
      routeDecision?: unknown;
      routeCategory?: unknown;
      requestId?: unknown;
      planner?: unknown;
      latencyMs?: unknown;
      feedback?: unknown;
    };

    if (candidate.role !== "assistant" && candidate.role !== "user") continue;
    if (typeof candidate.content !== "string") continue;

    const content = candidate.content.trim();
    if (content.length === 0) continue;

    sanitized.push({
      id: typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : createMessageId(),
      role: candidate.role,
      content: content.slice(0, 3200),
      propertySuggestions: sanitizePropertySuggestions(candidate.propertySuggestions),
      citations: sanitizeCitations(candidate.citations),
      suggestedPrompts: sanitizePromptList(candidate.suggestedPrompts),
      source: candidate.source === "local" || candidate.source === "edge" ? candidate.source : undefined,
      edgeProvider:
        candidate.edgeProvider === "gemini" || candidate.edgeProvider === "openai" || candidate.edgeProvider === "fallback"
          ? candidate.edgeProvider
          : undefined,
      ragUsed: typeof candidate.ragUsed === "boolean" ? candidate.ragUsed : undefined,
      retrievalMode:
        candidate.retrievalMode === "none" ||
        candidate.retrievalMode === "vector" ||
        candidate.retrievalMode === "keyword" ||
        candidate.retrievalMode === "hybrid"
          ? candidate.retrievalMode
          : undefined,
      routeDecision:
        typeof candidate.routeDecision === "string" && candidate.routeDecision.trim().length > 0
          ? candidate.routeDecision.trim().slice(0, 120)
          : undefined,
      routeCategory:
        candidate.routeCategory === "deterministic_local" ||
        candidate.routeCategory === "edge_rag" ||
        candidate.routeCategory === "edge_general" ||
        candidate.routeCategory === "edge_tools" ||
        candidate.routeCategory === "fallback"
          ? candidate.routeCategory
          : undefined,
      requestId:
        typeof candidate.requestId === "string" && candidate.requestId.trim().length > 0
          ? candidate.requestId.trim().slice(0, 120)
          : undefined,
      planner: sanitizePlannerMeta(candidate.planner),
      latencyMs:
        typeof candidate.latencyMs === "number" && Number.isFinite(candidate.latencyMs)
          ? clampNumber(Math.floor(candidate.latencyMs), 0, 120000)
          : undefined,
      feedback: sanitizeFeedback(candidate.feedback),
    });

    if (sanitized.length >= CHATBOT_MEMORY_LIMIT) {
      break;
    }
  }

  if (sanitized.length === 0) {
    return [initialMessage];
  }

  if (!sanitized.some((message) => message.role === "assistant")) {
    sanitized.unshift(initialMessage);
  }

  return trimMessages(sanitized);
}

function sanitizeConversationState(raw: unknown): ChatbotConversationState {
  if (!raw || typeof raw !== "object") return {};
  const candidate = raw as Record<string, unknown>;
  const state: ChatbotConversationState = {};

  if (candidate.recentSearch && typeof candidate.recentSearch === "object") {
    const recent = candidate.recentSearch as Record<string, unknown>;
    const resultIds = Array.isArray(recent.resultIds)
      ? recent.resultIds
          .map((value) => (typeof value === "number" ? value : Number(value)))
          .filter((value) => Number.isInteger(value) && value > 0)
          .slice(0, 20)
      : [];
    state.recentSearch = {
      params:
        recent.params && typeof recent.params === "object"
          ? (recent.params as ToolSearchParams)
          : undefined,
      resultIds,
      total: typeof recent.total === "number" && Number.isFinite(recent.total) ? Math.max(0, Math.floor(recent.total)) : undefined,
      generatedAt:
        typeof recent.generatedAt === "string" && recent.generatedAt.trim().length > 0
          ? recent.generatedAt.trim().slice(0, 80)
          : new Date().toISOString(),
    };
  }

  if (Array.isArray(candidate.selectedPropertyIds)) {
    state.selectedPropertyIds = candidate.selectedPropertyIds
      .map((value) => (typeof value === "number" ? value : Number(value)))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(0, 3);
  }

  if (Array.isArray(candidate.recentPropertyIds)) {
    state.recentPropertyIds = candidate.recentPropertyIds
      .map((value) => (typeof value === "number" ? value : Number(value)))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(0, 20);
  }

  if (candidate.leadDraft && typeof candidate.leadDraft === "object") {
    const draft = candidate.leadDraft as Record<string, unknown>;
    state.leadDraft = {
      propertyId: typeof draft.propertyId === "number" && Number.isInteger(draft.propertyId) ? draft.propertyId : undefined,
      citySlug: typeof draft.citySlug === "string" ? draft.citySlug.trim().slice(0, 80) : undefined,
      criteriaSummary:
        typeof draft.criteriaSummary === "string" ? draft.criteriaSummary.trim().slice(0, 500) : undefined,
    };
  }

  if (candidate.preferences && typeof candidate.preferences === "object") {
    const preferences = candidate.preferences as Record<string, unknown>;
    state.preferences = {
      transaction: preferences.transaction === "vente" || preferences.transaction === "location" ? preferences.transaction : undefined,
      type:
        preferences.type === "appartement" || preferences.type === "maison_villa" || preferences.type === "autre"
          ? preferences.type
          : undefined,
      city: typeof preferences.city === "string" ? preferences.city.trim().slice(0, 80) : undefined,
      bedroomsMin:
        typeof preferences.bedroomsMin === "number" && Number.isFinite(preferences.bedroomsMin)
          ? Math.max(0, Math.floor(preferences.bedroomsMin))
          : undefined,
      priceMin:
        typeof preferences.priceMin === "number" && Number.isFinite(preferences.priceMin)
          ? Math.max(0, Math.floor(preferences.priceMin))
          : undefined,
      priceMax:
        typeof preferences.priceMax === "number" && Number.isFinite(preferences.priceMax)
          ? Math.max(0, Math.floor(preferences.priceMax))
          : undefined,
    };
  }

  return state;
}

function readStoredConversationState(): ChatbotConversationState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CHATBOT_STATE_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeConversationState(JSON.parse(raw));
  } catch {
    return {};
  }
}

function mergeUniqueIds(existing: number[] | undefined, next: number[] | undefined, maxSize: number): number[] | undefined {
  const merged: number[] = [];
  const seen = new Set<number>();
  for (const id of [...(next ?? []), ...(existing ?? [])]) {
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
    if (merged.length >= maxSize) break;
  }
  return merged.length > 0 ? merged : undefined;
}

function mergeConversationState(
  current: ChatbotConversationState,
  patch: Partial<ChatbotConversationState> | undefined,
): ChatbotConversationState {
  if (!patch) return current;
  const merged: ChatbotConversationState = {
    ...current,
    ...patch,
    recentSearch: patch.recentSearch
      ? {
          ...current.recentSearch,
          ...patch.recentSearch,
        }
      : current.recentSearch,
    preferences: patch.preferences
      ? {
          ...current.preferences,
          ...patch.preferences,
        }
      : current.preferences,
    leadDraft: patch.leadDraft
      ? {
          ...current.leadDraft,
          ...patch.leadDraft,
        }
      : current.leadDraft,
  };

  merged.selectedPropertyIds = mergeUniqueIds(
    current.selectedPropertyIds,
    patch.selectedPropertyIds ?? current.selectedPropertyIds,
    3,
  );
  merged.recentPropertyIds = mergeUniqueIds(current.recentPropertyIds, patch.recentPropertyIds, 20);
  if (merged.recentSearch?.resultIds) {
    merged.recentSearch.resultIds = mergeUniqueIds(undefined, merged.recentSearch.resultIds, 20) ?? [];
  }
  return sanitizeConversationState(merged);
}

function formatCompactPrice(amount: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

function formatSurface(surface: number | null | undefined): string {
  if (typeof surface !== "number" || !Number.isFinite(surface)) return "—";
  return `${Math.round(surface)} m²`;
}

function readStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") {
    return [initialMessage];
  }

  try {
    const raw = window.localStorage.getItem(CHATBOT_STORAGE_KEY);
    if (!raw) {
      return [initialMessage];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return sanitizeStoredMessages(parsed);
    }

    if (parsed && typeof parsed === "object") {
      const payload = parsed as { version?: unknown; messages?: unknown };
      if (payload.version === CHATBOT_STORAGE_VERSION || Array.isArray(payload.messages)) {
        return sanitizeStoredMessages(payload.messages);
      }
    }

    return [initialMessage];
  } catch {
    return [initialMessage];
  }
}

export function SiteChatbot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages());
  const [conversationState, setConversationState] = useState<ChatbotConversationState>(() => readStoredConversationState());
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadForm, setLeadForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    criteria: "",
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const openingSequenceRef = useRef(0);
  const sessionIdRef = useRef<string>(readOrCreateChatbotSessionId());
  const conversationIdRef = useRef<string>(createMessageId());
  const [pendingFeedbackMessageId, setPendingFeedbackMessageId] = useState<string | null>(null);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => trimMessages([...current, message]));
  }, []);

  const emitChatbotTelemetry = useCallback(
    (
      eventType:
        | "reply_received"
        | "feedback_submitted"
        | "citation_clicked"
        | "request_failed"
        | "chatbot_opened"
        | "chatbot_reset"
        | "tool_action_rendered"
        | "tool_action_clicked"
        | "tool_orchestration_result"
        | "tool_compare_requested"
        | "tool_handoff_prefill_opened",
      payload: Omit<
        Parameters<typeof queueChatbotTelemetryEvent>[0],
        "eventId" | "eventType" | "sessionId" | "conversationId" | "pagePath"
      > = {},
    ) => {
      queueChatbotTelemetryEvent({
        eventId: createTelemetryEventId(),
        eventType,
        sessionId: sessionIdRef.current,
        conversationId: conversationIdRef.current,
        pagePath: `${location.pathname}${location.search}`,
        ...payload,
      });
    },
    [location.pathname, location.search],
  );

  const nextOpeningGreetingMessage = useCallback(() => {
    openingSequenceRef.current += 1;
    return buildOpeningGreetingMessage(openingSequenceRef.current);
  }, []);

  const cancelPendingRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const unlockRequestState = useCallback(() => {
    cancelPendingRequest();
    requestSequenceRef.current += 1;
    setLoading(false);
  }, [cancelPendingRequest]);

  const closeChat = useCallback(() => {
    unlockRequestState();
    setLeadLoading(false);
    setShowLeadCapture(false);
    setOpen(false);
  }, [unlockRequestState]);

  const resetConversation = useCallback(() => {
    unlockRequestState();
    setShowLeadCapture(false);
    setLeadLoading(false);
    setInput("");
    setPendingFeedbackMessageId(null);
    conversationIdRef.current = createMessageId();
    setConversationState({});
    setLeadForm({ firstName: "", lastName: "", email: "", criteria: "" });
    setMessages([nextOpeningGreetingMessage()]);
    trackEvent("chatbot_reset", { source: "site_chatbot" });
    emitChatbotTelemetry("chatbot_reset", { source: "local" });
    toast.success("Nouvelle conversation initialisée.");
  }, [emitChatbotTelemetry, nextOpeningGreetingMessage, unlockRequestState]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, showLeadCapture]);

  useEffect(() => {
    unlockRequestState();
    setLeadLoading(false);
    setShowLeadCapture(false);
    setOpen(false);
  }, [location.pathname, location.search, unlockRequestState]);

  useEffect(() => {
    return () => {
      cancelPendingRequest();
      void flushChatbotTelemetryQueue();
    };
  }, [cancelPendingRequest]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeChat();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, closeChat]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        CHATBOT_STORAGE_KEY,
        JSON.stringify({
          version: CHATBOT_STORAGE_VERSION,
          messages: trimMessages(messages),
        }),
      );
    } catch {
      // Ignore storage write failures (private mode, quota exceeded, etc.)
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(CHATBOT_STATE_STORAGE_KEY, JSON.stringify(sanitizeConversationState(conversationState)));
    } catch {
      // Ignore storage write failures
    }
  }, [conversationState]);

  const pushAssistantReply = useCallback(
    (
      reply: ChatbotReply,
      telemetry?: {
        responseLatencyMs?: number;
        requestChars?: number;
      },
    ) => {
      const messageId = createMessageId();
      appendMessage({
        id: messageId,
        role: "assistant",
        content: reply.answer,
        propertySuggestions: reply.propertySuggestions,
        citations: reply.citations,
        actions: reply.actions,
        toolTrace: reply.toolTrace,
        suggestedPrompts: reply.suggestedPrompts,
        source: reply.source,
        edgeProvider: reply.edgeProvider,
        ragUsed: reply.ragUsed,
        retrievalMode: reply.retrievalMode,
        routeDecision: reply.routeDecision,
        routeCategory: reply.routeCategory,
        requestId: reply.requestId,
        agentMode: reply.agentMode,
        planner: reply.planner,
        latencyMs: telemetry?.responseLatencyMs,
      });

      if (reply.conversationStatePatch) {
        setConversationState((current) => mergeConversationState(current, reply.conversationStatePatch));
      }

      trackEvent("chatbot_reply_received", {
        source: reply.source,
        edgeProvider: reply.edgeProvider,
        ragUsed: reply.ragUsed,
        retrievalMode: reply.retrievalMode,
        routeCategory: reply.routeCategory,
        citationsCount: reply.citations?.length ?? 0,
      });
      emitChatbotTelemetry("reply_received", {
        messageId,
        requestId: reply.requestId,
        source: reply.source,
        edgeProvider: reply.edgeProvider,
        routeDecision: reply.routeDecision,
        routeCategory: reply.routeCategory,
        ragUsed: reply.ragUsed,
        retrievalMode: reply.retrievalMode,
        citationsCount: reply.citations?.length ?? 0,
        responseLatencyMs: telemetry?.responseLatencyMs,
        requestChars: telemetry?.requestChars,
        answerChars: reply.answer.trim().length,
        metadata: mergeTelemetryMetadata(undefined, reply.planner),
      });

      if (reply.actions && reply.actions.length > 0) {
        for (const action of reply.actions) {
          trackEvent("chatbot_tool_action_rendered", {
            actionKind: action.kind,
            source: reply.source,
            edgeProvider: reply.edgeProvider,
            routeCategory: reply.routeCategory,
          });
          emitChatbotTelemetry("tool_action_rendered", {
            messageId,
            requestId: reply.requestId,
            source: reply.source,
            edgeProvider: reply.edgeProvider,
            routeDecision: reply.routeDecision,
            routeCategory: reply.routeCategory,
            ragUsed: reply.ragUsed,
            retrievalMode: reply.retrievalMode,
            metadata: mergeTelemetryMetadata(
              {
                actionKind: action.kind,
                actionId: action.id,
              },
              reply.planner,
            ),
          });
        }
      }

      if (reply.toolTrace && reply.toolTrace.length > 0) {
        for (const trace of reply.toolTrace) {
          trackEvent("chatbot_tool_orchestration_result", {
            toolName: trace.tool,
            status: trace.status,
            source: reply.source,
            routeCategory: reply.routeCategory,
          });
          emitChatbotTelemetry("tool_orchestration_result", {
            messageId,
            requestId: reply.requestId,
            source: reply.source,
            edgeProvider: reply.edgeProvider,
            routeDecision: reply.routeDecision,
            routeCategory: reply.routeCategory,
            responseLatencyMs: trace.latencyMs,
            metadata: mergeTelemetryMetadata(
              {
                toolName: trace.tool,
                status: trace.status,
                resultCount: trace.resultCount,
                errorCode: trace.errorCode,
              },
              reply.planner,
            ),
          });
        }
      }

      if (reply.needsLeadCapture) {
        setShowLeadCapture(true);
      }
    },
    [appendMessage, emitChatbotTelemetry],
  );

  const sendChatRequest = async (params: {
    question: string;
    actionRequest?: ChatbotActionRequest;
    syntheticPrompt?: string;
  }) => {
    const text = params.question.trim();
    if (!text || loading) return;

    cancelPendingRequest();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const nextRequestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = nextRequestId;

    const chatHistory = buildChatHistoryPayload(messages, text);

    appendMessage({ id: createMessageId(), role: "user", content: params.syntheticPrompt?.trim() || text });
    trackEvent("chatbot_message_sent", {
      source: "site_chatbot",
      requestChars: text.length,
      hasHistory: chatHistory.length > 1,
      routeHint: params.actionRequest ? "edge_tools" : undefined,
      actionType: params.actionRequest?.type,
    });
    if (params.actionRequest) {
      trackEvent("chatbot_tool_action_clicked", {
        actionType: params.actionRequest.type,
      });
      emitChatbotTelemetry("tool_action_clicked", {
        source: "edge",
        routeCategory: "edge_tools",
        metadata: {
          actionType: params.actionRequest.type,
        },
      });
      if (params.actionRequest.type === "compare_selected_properties") {
        trackEvent("chatbot_tool_compare_requested", {});
        emitChatbotTelemetry("tool_compare_requested", {
          source: "edge",
          routeCategory: "edge_tools",
          metadata: {
            selectedPropertyIdsCount: Array.isArray(params.actionRequest.payload?.propertyIds)
              ? params.actionRequest.payload.propertyIds.length
              : 0,
          },
        });
      }
    }
    setInput("");
    setShowLeadCapture(false);
    setPendingFeedbackMessageId(null);
    setLoading(true);

    const requestStartedAt = performance.now();
    let timeoutId: number | undefined;
    let hardUnlockId: number | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(new DOMException("Request timeout", "AbortError"));
        }, CHATBOT_REQUEST_TIMEOUT_MS);
      });

      hardUnlockId = window.setTimeout(() => {
        if (requestSequenceRef.current !== nextRequestId) return;

        unlockRequestState();
        toast.error("Le chatbot met trop de temps à répondre. Vous pouvez relancer votre question.");
      }, CHATBOT_HARD_UNLOCK_MS);

      const reply = await Promise.race([
        askAgencyChatbot({
          question: text,
          chatHistory,
          conversationState,
          actionRequest: params.actionRequest,
          signal: controller.signal,
        }),
        timeoutPromise,
      ]);

      const elapsedMs = performance.now() - requestStartedAt;
      const minDelayMs = computeReplyDelayMs(text);

      if (elapsedMs < minDelayMs) {
        await new Promise((resolve) => window.setTimeout(resolve, minDelayMs - elapsedMs));
      }

      if (requestSequenceRef.current !== nextRequestId) {
        return;
      }

      pushAssistantReply(reply, {
        responseLatencyMs: Math.round(performance.now() - requestStartedAt),
        requestChars: text.length,
      });
    } catch (error) {
      if (requestSequenceRef.current !== nextRequestId) {
        return;
      }

      const aborted = error instanceof DOMException && error.name === "AbortError";

      toast.error(
        aborted
          ? "Le chatbot a pris trop de temps à répondre. Réessayez votre question."
          : "Le chatbot est momentanément indisponible.",
      );
      trackEvent("chatbot_request_failed", {
        source: "site_chatbot",
        aborted,
      });
      emitChatbotTelemetry("request_failed", {
        source: "local",
        routeCategory: "fallback",
        routeDecision: aborted ? "request_timeout" : "request_error",
        responseLatencyMs: Math.round(performance.now() - requestStartedAt),
        requestChars: text.length,
        metadata: {
          aborted,
        },
      });

      appendMessage({
        id: createMessageId(),
        role: "assistant",
        content:
          "Je reste à votre disposition. Reformulez votre demande et je vous répondrai sur les biens, les quartiers et les services adaptés à votre projet au Havre.",
        suggestedPrompts: chatbotExamplePrompts,
        source: "local",
        routeCategory: "fallback",
        routeDecision: aborted ? "request_timeout" : "request_error",
      });
    } finally {
      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
      }

      if (typeof hardUnlockId === "number") {
        window.clearTimeout(hardUnlockId);
      }

      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      if (requestSequenceRef.current === nextRequestId) {
        setLoading(false);
      }
    }
  };

  const sendMessage = async (value: string) => {
    await sendChatRequest({ question: value });
  };

  const sendAction = async (actionRequest: ChatbotActionRequest, opts?: { syntheticPrompt?: string }) => {
    await sendChatRequest({
      question: opts?.syntheticPrompt ?? actionRequest.type,
      actionRequest,
      syntheticPrompt: opts?.syntheticPrompt,
    });
  };

  const handlePromptClick = (prompt: string) => {
    void sendMessage(prompt);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleCancelLoading = () => {
    unlockRequestState();
  };

  const handleLeadSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!leadForm.firstName || !leadForm.lastName || !leadForm.email || !leadForm.criteria) {
      toast.error("Merci de remplir tous les champs pour transmettre votre demande.");
      return;
    }

    setLeadLoading(true);

    try {
      await submitLead({
        source: "contact_page",
        firstName: leadForm.firstName,
        lastName: leadForm.lastName,
        email: leadForm.email,
        message: `Demande chatbot - aucun bien trouvé\n\nCritères: ${leadForm.criteria}`,
        consent: true,
      });

      appendMessage({
        id: createMessageId(),
        role: "assistant",
        content:
          "Votre demande a été transmise à l'agence. Un conseiller vous enverra une sélection de biens adaptés par email.",
      });

      setLeadForm({ firstName: "", lastName: "", email: "", criteria: "" });
      setShowLeadCapture(false);
      toast.success("Demande envoyée à l'agence.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de transmettre votre demande.";
      toast.error(message);
    } finally {
      setLeadLoading(false);
    }
  };

  const submitAssistantFeedback = useCallback(
    (message: ChatMessage, value: 1 | -1, reason?: string) => {
      if (message.role !== "assistant" || isOpeningGreetingMessage(message) || message.feedback) {
        return;
      }

      const submittedAt = Date.now();
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                feedback: {
                  value,
                  reason,
                  submittedAt,
                },
              }
            : item,
        ),
      );
      setPendingFeedbackMessageId((current) => (current === message.id ? null : current));

      trackEvent("chatbot_feedback_submitted", {
        feedbackValue: value,
        feedbackReason: reason,
        source: message.source,
        edgeProvider: message.edgeProvider,
        routeCategory: message.routeCategory,
      });

      emitChatbotTelemetry("feedback_submitted", {
        messageId: message.id,
        requestId: message.requestId,
        source: message.source ?? "local",
        edgeProvider: message.edgeProvider,
        routeDecision: message.routeDecision,
        routeCategory: message.routeCategory,
        ragUsed: message.ragUsed,
        retrievalMode: message.retrievalMode,
        citationsCount: message.citations?.length ?? 0,
        responseLatencyMs: message.latencyMs,
        answerChars: message.content.trim().length,
        feedbackValue: value,
        feedbackReason: reason,
      });
    },
    [emitChatbotTelemetry],
  );

  const handleFeedbackVoteClick = useCallback(
    (message: ChatMessage, value: 1 | -1) => {
      if (message.feedback) return;
      if (value === -1) {
        setPendingFeedbackMessageId(message.id);
        return;
      }
      submitAssistantFeedback(message, 1);
    },
    [submitAssistantFeedback],
  );

  const handleFeedbackReasonSelect = useCallback(
    (message: ChatMessage, reason: string) => {
      if (message.feedback) return;
      submitAssistantFeedback(message, -1, reason);
    },
    [submitAssistantFeedback],
  );

  const navigateFromChat = useCallback(
    (path: string) => {
      closeChat();
      navigate(path);
    },
    [closeChat, navigate],
  );

  const handlePropertySuggestionClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, path: string) => {
      event.preventDefault();
      event.stopPropagation();
      navigateFromChat(path);
    },
    [navigateFromChat],
  );

  const handleInternalPathClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, path: string) => {
      event.preventDefault();
      event.stopPropagation();
      navigateFromChat(path);
    },
    [navigateFromChat],
  );

  const handleCitationClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, message: ChatMessage, path: string) => {
      trackEvent("chatbot_citation_clicked", {
        citationPath: path,
        source: message.source,
        edgeProvider: message.edgeProvider,
        routeCategory: message.routeCategory,
      });
      emitChatbotTelemetry("citation_clicked", {
        messageId: message.id,
        requestId: message.requestId,
        source: message.source ?? "local",
        edgeProvider: message.edgeProvider,
        routeDecision: message.routeDecision,
        routeCategory: message.routeCategory,
        ragUsed: message.ragUsed,
        retrievalMode: message.retrievalMode,
        citationsCount: message.citations?.length ?? 0,
        citationPath: path,
      });
      handleInternalPathClick(event, path);
    },
    [emitChatbotTelemetry, handleInternalPathClick],
  );

  const toggleSelectedPropertyId = useCallback((propertyId: number) => {
    setConversationState((current) => {
      const existing = current.selectedPropertyIds ?? [];
      if (existing.includes(propertyId)) {
        return mergeConversationState(current, {
          selectedPropertyIds: existing.filter((id) => id !== propertyId),
        });
      }
      if (existing.length >= 3) {
        toast.info("Vous pouvez comparer jusqu’à 3 biens.");
        return current;
      }
      return mergeConversationState(current, {
        selectedPropertyIds: [...existing, propertyId],
      });
    });
  }, []);

  const prefillLeadFormFromCriteria = useCallback(
    (criteria: string) => {
      setLeadForm((current) => ({
        ...current,
        criteria: criteria.trim().slice(0, 2500),
      }));
      setShowLeadCapture(true);
      setOpen(true);
      trackEvent("chatbot_tool_handoff_prefill_opened", { source: "site_chatbot" });
      emitChatbotTelemetry("tool_handoff_prefill_opened", {
        source: "edge",
        routeCategory: "edge_tools",
      });
    },
    [emitChatbotTelemetry],
  );

  const handleToolOpenPage = useCallback(
    (
      path: string,
      meta?: {
        requestId?: string;
        routeCategory?: ChatMessage["routeCategory"];
        edgeProvider?: ChatMessage["edgeProvider"];
        planner?: ChatMessage["planner"];
      },
    ) => {
      trackEvent("chatbot_tool_action_clicked", {
        actionKind: "open_page",
        path,
        routeCategory: meta?.routeCategory,
      });
      emitChatbotTelemetry("tool_action_clicked", {
        requestId: meta?.requestId,
        source: "edge",
        edgeProvider: meta?.edgeProvider,
        routeCategory: meta?.routeCategory ?? "edge_tools",
        metadata: mergeTelemetryMetadata(
          {
            actionKind: "open_page",
            path,
          },
          meta?.planner,
        ),
      });
      navigateFromChat(path);
    },
    [emitChatbotTelemetry, navigateFromChat],
  );

  const handleCompareSelectionRequest = (message: ChatMessage) => {
    const selectedIds = (conversationState.selectedPropertyIds ?? []).slice(0, 3);
    if (selectedIds.length < 2) {
      toast.info("Sélectionnez au moins 2 biens pour comparer.");
      return;
    }
    void sendAction(
      {
        type: "compare_selected_properties",
        payload: { propertyIds: selectedIds },
      },
      { syntheticPrompt: "Comparer la sélection" },
    );
    emitChatbotTelemetry("tool_compare_requested", {
      messageId: message.id,
      requestId: message.requestId,
      source: "edge",
      edgeProvider: message.edgeProvider,
      routeCategory: message.routeCategory ?? "edge_tools",
      metadata: mergeTelemetryMetadata(
        {
          selectedPropertyIdsCount: selectedIds.length,
        },
        message.planner,
      ),
    });
  };

  const handleSearchRefineAction = (searchParams: ToolSearchParams, nextPage: number) => {
    void sendAction(
      {
        type: "search_refine",
        payload: {
          searchParams,
          page: nextPage,
          pageSize: searchParams.pageSize,
        },
      },
      { syntheticPrompt: `Voir plus de résultats (page ${nextPage})` },
    );
  };

  const handlePrepareHandoffAction = (propertyIds?: number[]) => {
    void sendAction(
      {
        type: "prepare_handoff",
        payload: propertyIds && propertyIds.length > 0 ? { propertyIds: propertyIds.slice(0, 3) } : undefined,
      },
      { syntheticPrompt: "Préremplir le formulaire de contact" },
    );
  };

  const handleResetButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resetConversation();
  };

  const handleCloseButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    closeChat();
  };

  const renderMessageContent = useCallback(
    (content: string) => {
      const segments = content.split(internalPathSplitPattern);

      return segments.map((segment, index) => {
        const trimmed = segment.trim();

        if (internalPathMatchPattern.test(trimmed)) {
          return (
            <Link
              key={`path-${trimmed}-${index}`}
              to={trimmed}
              onClick={(event) => handleInternalPathClick(event, trimmed)}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {trimmed}
            </Link>
          );
        }

        return <Fragment key={`text-${index}`}>{segment}</Fragment>;
      });
    },
    [handleInternalPathClick],
  );

  const renderToolActionCard = useCallback(
    (message: ChatMessage, action: ChatbotUiAction) => {
      if (action.kind === "notice") {
        return (
          <div className="mt-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs">
            <p className="font-medium">{action.title}</p>
            {action.description && <p className="mt-1 text-muted-foreground">{action.description}</p>}
          </div>
        );
      }

      if (action.kind === "open_page") {
        return (
          <div className="mt-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs">
            <p className="font-medium">{action.title}</p>
            {action.description && <p className="mt-1 text-muted-foreground">{action.description}</p>}
            <button
              type="button"
              onClick={() =>
                handleToolOpenPage(action.data.path, {
                  requestId: message.requestId,
                  routeCategory: message.routeCategory,
                  edgeProvider: message.edgeProvider,
                  planner: message.planner,
                })}
              className="mt-2 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-muted"
            >
              {action.data.label || "Ouvrir"}
            </button>
          </div>
        );
      }

      if (action.kind === "lead_handoff_draft") {
        return (
          <div className="mt-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs">
            <p className="font-medium">{action.title}</p>
            {action.description && <p className="mt-1 text-muted-foreground">{action.description}</p>}
            <p className="mt-2 whitespace-pre-line text-foreground/90">{action.data.contextSummary}</p>
            <button
              type="button"
              onClick={() => prefillLeadFormFromCriteria(action.data.prefill.criteria)}
              className="mt-2 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-muted"
            >
              Préremplir le formulaire
            </button>
          </div>
        );
      }

      if (action.kind === "compare_summary") {
        return (
          <div className="mt-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{action.title}</p>
              {action.data.recommendedPropertyId && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700">
                  Recommandé
                </span>
              )}
            </div>
            {action.description && <p className="mt-1 text-muted-foreground">{action.description}</p>}
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[280px] text-[11px]">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-1 pr-2 font-medium">Critère</th>
                    {action.data.properties.map((property) => (
                      <th key={`${action.id}-col-${property.id}`} className="pb-1 pr-2 font-medium">
                        {property.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {action.data.comparisonRows.map((row) => (
                    <tr key={`${action.id}-${row.label}`} className="align-top">
                      <td className="pr-2 pt-1 font-medium">{row.label}</td>
                      {row.values.map((value, index) => (
                        <td key={`${action.id}-${row.label}-${index}`} className="pr-2 pt-1 text-foreground/90">
                          {value ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {action.data.properties.map((property) => (
                <button
                  key={`${action.id}-open-${property.id}`}
                  type="button"
                  onClick={() =>
                    handleToolOpenPage(property.path, {
                      requestId: message.requestId,
                      routeCategory: message.routeCategory,
                      edgeProvider: message.edgeProvider,
                      planner: message.planner,
                    })}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-muted"
                >
                  Ouvrir {property.id === action.data.recommendedPropertyId ? "le recommandé" : property.title}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePrepareHandoffAction(action.data.propertyIds)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-muted"
              >
                Préremplir le formulaire
              </button>
            </div>
          </div>
        );
      }

      if (action.kind === "search_results") {
        const selectedIds = conversationState.selectedPropertyIds ?? [];
        const nextPage = Math.max(2, (action.data.searchParams.page ?? 1) + 1);

        return (
          <div className="mt-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs">
            <p className="font-medium">{action.title}</p>
            <p className="mt-1 text-muted-foreground">{action.data.criteriaSummary}</p>
            {action.description && <p className="mt-1 text-muted-foreground">{action.description}</p>}

            <div className="mt-2 space-y-2">
              {action.data.items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div key={`${action.id}-item-${item.id}`} className="rounded-md border border-border bg-card/90 px-2.5 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-muted-foreground">
                          {item.cityName || item.citySlug} · {formatCompactPrice(item.priceAmount, item.currency)}
                          {item.surfaceM2 ? ` · ${formatSurface(item.surfaceM2)}` : ""}
                          {typeof item.bedrooms === "number" ? ` · ${item.bedrooms} ch.` : ""}
                        </p>
                      </div>
                      {item.dpeLabel && (
                        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px]">
                          DPE {item.dpeLabel}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleToolOpenPage(item.path, {
                            requestId: message.requestId,
                            routeCategory: message.routeCategory,
                            edgeProvider: message.edgeProvider,
                            planner: message.planner,
                          })}
                        className="rounded-full border border-border bg-background px-2 py-1 text-[11px] hover:bg-muted"
                      >
                        Ouvrir
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelectedPropertyId(item.id)}
                        className={cn(
                          "rounded-full border px-2 py-1 text-[11px]",
                          isSelected
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                            : "border-border bg-background hover:bg-muted",
                        )}
                      >
                        {isSelected ? "Sélectionné" : "Sélectionner"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrepareHandoffAction([item.id])}
                        className="rounded-full border border-border bg-background px-2 py-1 text-[11px] hover:bg-muted"
                      >
                        Préremplir contact
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleCompareSelectionRequest(message)}
                disabled={(conversationState.selectedPropertyIds?.length ?? 0) < 2}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-muted disabled:opacity-50"
              >
                Comparer la sélection
              </button>
              {action.data.total > action.data.items.length && (
                <button
                  type="button"
                  onClick={() => handleSearchRefineAction(action.data.searchParams, nextPage)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-muted"
                >
                  Voir plus de résultats
                </button>
              )}
              <button
                type="button"
                onClick={() => handlePrepareHandoffAction()}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-muted"
              >
                Préremplir le formulaire
              </button>
            </div>
          </div>
        );
      }

      return null;
    },
    [
      conversationState.selectedPropertyIds,
      emitChatbotTelemetry,
      handleCompareSelectionRequest,
      handlePrepareHandoffAction,
      handleSearchRefineAction,
      handleToolOpenPage,
      prefillLeadFormFromCriteria,
      toggleSelectedPropertyId,
    ],
  );

  const openChatWithGreeting = () => {
    if (open) {
      closeChat();
      return;
    }

    trackEvent("chatbot_opened", { source: "site_chatbot" });
    emitChatbotTelemetry("chatbot_opened", { source: "local" });
    setOpen(true);
    setMessages((current) => {
      if (current.length === 0) {
        return [nextOpeningGreetingMessage()];
      }

      const lastMessage = current[current.length - 1];
      if (lastMessage && isOpeningGreetingMessage(lastMessage)) {
        return current;
      }

      const hasUserMessages = current.some((message) => message.role === "user");
      if (hasUserMessages) {
        return current;
      }

      return trimMessages([...current, nextOpeningGreetingMessage()]);
    });
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fermer le chatbot"
          className="fixed inset-0 z-[150] bg-black/20 backdrop-blur-[1px]"
          onClick={closeChat}
        />
      )}

      <div className="pointer-events-auto fixed z-[160] bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] max-w-[calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-1.5rem)]">
      {open && (
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="pointer-events-auto mb-3 w-[min(94vw,420px)] rounded-2xl border border-border bg-card shadow-card max-sm:w-full"
        >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assistant IA</p>
                <h2 className="font-display text-xl sm:text-2xl">Chatbot immobilier Le Havre</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Réinitialiser la conversation"
                  title="Nouvelle conversation"
                  className="rounded-full border border-border p-1.5"
                  onClick={handleResetButtonClick}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  aria-label="Fermer le chatbot"
                  className="rounded-full border border-border p-1.5"
                  onClick={handleCloseButtonClick}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="max-h-[52vh] space-y-3 overflow-y-auto px-4 py-4 sm:max-h-[56vh]">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    "max-w-[92%] rounded-xl px-3 py-2 text-sm",
                    message.role === "assistant"
                      ? "bg-muted text-foreground"
                      : "ml-auto bg-primary text-primary-foreground",
                  )}
                >
                  <p>{renderMessageContent(message.content)}</p>

                  {message.propertySuggestions && message.propertySuggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.propertySuggestions.map((property) => (
                        <Link
                          key={property.id}
                          to={property.path}
                          className="block rounded-lg border border-border bg-card/90 px-3 py-2 text-xs text-foreground hover:bg-muted"
                          onClick={(event) => handlePropertySuggestionClick(event, property.path)}
                        >
                          <span className="font-medium">{property.title}</span>
                          <br />
                          <span className="text-muted-foreground">
                            {property.city} · {property.price}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {message.citations && message.citations.length > 0 && message.role === "assistant" && (
                    <div className="mt-3 space-y-1 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Sources du site
                      </p>
                      <div className="space-y-1">
                        {message.citations.map((citation, index) => (
                          <Link
                            key={`${message.id}-citation-${citation.path}-${index}`}
                            to={citation.path}
                            onClick={(event) => handleCitationClick(event, message, citation.path)}
                            className="block rounded-md px-1.5 py-1 text-xs text-foreground hover:bg-muted"
                          >
                            <span className="font-medium">{citation.title || citation.path}</span>
                            {citation.title && (
                              <span className="ml-1 text-muted-foreground">{citation.path}</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {message.role === "assistant" && message.actions && message.actions.length > 0 && (
                    <div>
                      {message.actions.map((action) => (
                        <Fragment key={`${message.id}-${action.id}`}>{renderToolActionCard(message, action)}</Fragment>
                      ))}
                    </div>
                  )}

                  {message.role === "assistant" && !isOpeningGreetingMessage(message) && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Réponse utile"
                          title="Réponse utile"
                          disabled={Boolean(message.feedback)}
                          onClick={() => handleFeedbackVoteClick(message, 1)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors",
                            message.feedback?.value === 1
                              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700"
                              : "border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-60",
                          )}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          Utile
                        </button>
                        <button
                          type="button"
                          aria-label="Réponse peu utile"
                          title="Réponse peu utile"
                          disabled={Boolean(message.feedback)}
                          onClick={() => handleFeedbackVoteClick(message, -1)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors",
                            message.feedback?.value === -1
                              ? "border-amber-500/60 bg-amber-500/10 text-amber-700"
                              : "border-border bg-background text-muted-foreground hover:bg-muted disabled:opacity-60",
                          )}
                        >
                          <ThumbsDown className="h-3 w-3" />
                          Peu utile
                        </button>
                        {message.feedback && (
                          <span className="text-[10px] text-muted-foreground">
                            Merci pour votre retour.
                          </span>
                        )}
                      </div>

                      {pendingFeedbackMessageId === message.id && !message.feedback && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {chatbotFeedbackReasonOptions.map((reason) => (
                            <button
                              key={`${message.id}-feedback-${reason}`}
                              type="button"
                              onClick={() => handleFeedbackReasonSelect(message, reason)}
                              className="rounded-full border border-border bg-background px-2 py-1 text-[10px] text-foreground/90 hover:bg-muted"
                            >
                              {reason}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => submitAssistantFeedback(message, -1)}
                            className="rounded-full border border-dashed border-border bg-background px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
                          >
                            Sans précision
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {message.suggestedPrompts && message.suggestedPrompts.length > 0 && message.role === "assistant" && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.suggestedPrompts.slice(0, 4).map((prompt) => (
                        <button
                          key={`${message.id}-${prompt}`}
                          type="button"
                          onClick={() => handlePromptClick(prompt)}
                          disabled={loading}
                          className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground/90 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))}

              {loading && (
                <div className="max-w-[78%] rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <p>Analyse de votre demande...</p>
                  <button type="button" onClick={handleCancelLoading} className="mt-1 text-xs underline underline-offset-2">
                    Annuler et reprendre la saisie
                  </button>
                </div>
              )}
            </div>

            {showLeadCapture && (
              <section className="border-t border-border bg-muted/30 px-4 py-4">
                <h3 className="font-medium">Vous ne trouvez pas le bon bien ?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Laissez votre email et vos critères: la demande part automatiquement à l'agence.
                </p>

                <form onSubmit={handleLeadSubmit} className="mt-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Prénom"
                      value={leadForm.firstName}
                      onChange={(event) =>
                        setLeadForm((current) => ({ ...current, firstName: event.target.value }))
                      }
                    />
                    <Input
                      placeholder="Nom"
                      value={leadForm.lastName}
                      onChange={(event) =>
                        setLeadForm((current) => ({ ...current, lastName: event.target.value }))
                      }
                    />
                  </div>

                  <Input
                    type="email"
                    placeholder="email@exemple.fr"
                    value={leadForm.email}
                    onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))}
                  />

                  <Textarea
                    rows={3}
                    placeholder="Ex: appartement T3, quartier Perret, budget 260 000 EUR"
                    value={leadForm.criteria}
                    onChange={(event) => setLeadForm((current) => ({ ...current, criteria: event.target.value }))}
                  />

                  <Button type="submit" size="sm" disabled={leadLoading} className="w-full">
                    <Mail className="mr-1 h-4 w-4" />
                    {leadLoading ? "Transmission..." : "Envoyer à l'agence"}
                  </Button>
                </form>
              </section>
            )}

            <div className="border-t border-border px-4 py-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Posez une question sur les biens, les quartiers ou les étapes de votre projet..."
                  disabled={loading}
                />
                <Button type="submit" size="icon" disabled={loading || input.trim().length === 0}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] leading-4 text-muted-foreground">
                <span>AI can make mistakes, so double-check it.</span>
                <a
                  href="https://support.google.com/gemini/answer/13594961?hl=en"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Learn more
                </a>
                <span aria-hidden="true" className="text-border">
                  •
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                  <GeminiLogo />
                  Made with Gemini
                </span>
              </div>
            </div>
        </motion.section>
      )}

      <Button
        type="button"
        variant="brand"
        className="h-10 max-w-[13.5rem] rounded-full px-3 text-xs shadow-card sm:h-12 sm:max-w-none sm:px-4 sm:text-sm"
        onClick={openChatWithGreeting}
      >
        {open ? <X className="mr-1 h-4 w-4" /> : <BotMessageSquare className="mr-1 h-4 w-4" />}
        <span className="sm:hidden">{open ? "Fermer" : "Assistant IA"}</span>
        <span className="hidden sm:inline">{open ? "Fermer" : "Assistant immobilier IA"}</span>
        <Sparkles className="ml-1 h-3.5 w-3.5" />
      </Button>
      </div>
    </>
  );
}
