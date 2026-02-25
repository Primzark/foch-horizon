import { FormEvent, Fragment, MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BotMessageSquare, Mail, RotateCcw, Send, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  askAgencyChatbot,
  askAgencyChatbotStream,
  type ChatbotActionRequest,
  type ChatbotAnalysisCard,
  type ChatbotCitation,
  type ChatbotConversationState,
  type ChatbotPlannerMeta,
  type ChatbotToolTrace,
  type ChatbotUiAction,
  chatbotExamplePrompts,
  type ChatbotPropertySuggestion,
  type ChatbotReply,
  type ToolSearchParams,
  resetAgencyChatbotMemory,
} from "@/features/content/api/chatbot.service";
import { flushChatbotTelemetryQueue, queueChatbotTelemetryEvent } from "@/features/content/api/chatbotFeedback.service";
import { submitLead } from "@/features/leads/api/leads.service";
import { trackEvent } from "@/lib/analytics/events";
import { useUiStore } from "@/lib/state/useUiStore";
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
  analysisCards?: ChatbotAnalysisCard[];
  memory?: ChatbotReply["memory"];
  pageContextUsed?: boolean;
  pageContextMode?: "http" | "headless";
  pageContextCacheHit?: boolean;
  costHints?: ChatbotReply["costHints"];
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
  const logoPath =
    "M64 4C67.9 24.6 73.4 34.1 81.7 42.3C89.9 50.6 99.4 56.1 120 60C99.4 63.9 89.9 69.4 81.7 77.7C73.4 85.9 67.9 95.4 64 116C60.1 95.4 54.6 85.9 46.3 77.7C38.1 69.4 28.6 63.9 8 60C28.6 56.1 38.1 50.6 46.3 42.3C54.6 34.1 60.1 24.6 64 4Z";

  return (
    <svg
      viewBox="0 0 128 128"
      aria-hidden="true"
      focusable="false"
      className={cn("h-3.5 w-3.5", className)}
    >
      <defs>
        <clipPath id="gemini-chatbot-logo-clip">
          <path d={logoPath} />
        </clipPath>
        <filter id="gemini-chatbot-logo-blur" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <g clipPath="url(#gemini-chatbot-logo-clip)">
        <g filter="url(#gemini-chatbot-logo-blur)">
          <circle cx="64" cy="8" r="54" fill="#ff3b44" />
          <circle cx="8" cy="64" r="56" fill="#ffc400" />
          <circle cx="120" cy="64" r="58" fill="#3385ff" />
          <circle cx="64" cy="120" r="56" fill="#00c853" />
          <circle cx="64" cy="64" r="38" fill="#3a86ff" opacity="0.75" />
        </g>
      </g>
      <path d={logoPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
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
const CHATBOT_STREAMING_ENABLED = ((import.meta.env.VITE_CHATBOT_STREAMING_ENABLED as string | undefined) ?? "false").toLowerCase() === "true";
const CHATBOT_MULTIMODAL_CARDS_ENABLED =
  ((import.meta.env.VITE_CHATBOT_MULTIMODAL_CARDS_ENABLED as string | undefined) ?? "true").toLowerCase() !== "false";
const CHATBOT_PERSISTENT_MEMORY_ENABLED =
  ((import.meta.env.VITE_CHATBOT_PERSISTENT_MEMORY_ENABLED as string | undefined) ?? "false").toLowerCase() === "true";

const internalPathSplitPattern = /(\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?)/gi;
const internalPathMatchPattern = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?$/i;
const chatbotFeedbackReasonOptions = [
  "Hors sujet",
  "Source/lien incorrect",
  "Réponse incomplète",
  "Je voulais des biens",
  "Trop lent",
] as const;

function isEdgeChatStreamingEligible(actionRequest?: ChatbotActionRequest): boolean {
  if (!actionRequest) return true;

  // The SSE endpoint emits the complete normalized reply in `done`, so streaming
  // remains compatible with tool replies that include actions/citations.
  return (
    actionRequest.type === "search_refine" ||
    actionRequest.type === "compare_selected_properties" ||
    actionRequest.type === "open_path_confirmed" ||
    actionRequest.type === "prepare_handoff" ||
    actionRequest.type === "prefill_lead_form"
  );
}

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
    .map((citation) => {
      const path = citation.path.trim();
      const inferredKind =
        citation.kind === "site" || citation.kind === "web"
          ? citation.kind
          : path.startsWith("/")
            ? "site"
            : /^https?:\/\//i.test(path)
              ? "web"
              : null;
      if (!inferredKind) return null;
      if (inferredKind === "site" && !path.startsWith("/")) return null;
      if (inferredKind === "web" && !/^https?:\/\//i.test(path)) return null;

      const sourceUrl = typeof citation.sourceUrl === "string" ? citation.sourceUrl.trim() : undefined;
      const safeWebSourceUrl = sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : undefined;
      return {
        kind: inferredKind,
        path,
        title: typeof citation.title === "string" ? citation.title.trim() : undefined,
        sourceUrl: inferredKind === "web" ? safeWebSourceUrl || path : sourceUrl,
        similarity: typeof citation.similarity === "number" ? citation.similarity : undefined,
      } satisfies ChatbotCitation;
    })
    .filter((citation): citation is ChatbotCitation => Boolean(citation))
    .slice(0, 6);

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
    candidate.decisionType === "tool_call" ||
    candidate.decisionType === "clarify" ||
    candidate.decisionType === "plan" ||
    candidate.decisionType === "none"
      ? candidate.decisionType
      : null;

  if (!provider || !mode || !decisionType) return undefined;

  return {
    provider,
    mode,
    decisionType,
    toolName:
      candidate.toolName === "search_properties" ||
      candidate.toolName === "get_properties" ||
      candidate.toolName === "compare_properties" ||
      candidate.toolName === "prepare_handoff" ||
      candidate.toolName === "get_property_media_context" ||
      candidate.toolName === "get_property_document_context" ||
      candidate.toolName === "retrieve_site_context"
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
  replyMeta?: Pick<ChatbotReply, "pageContextUsed" | "pageContextMode" | "pageContextCacheHit" | "memory">,
): Record<string, unknown> | undefined {
  const plannerMeta = plannerTelemetryMetadata(planner);
  const replyTelemetry =
    replyMeta && (replyMeta.pageContextUsed != null || replyMeta.pageContextMode || replyMeta.pageContextCacheHit != null || replyMeta.memory)
      ? {
          pageContextUsed: replyMeta.pageContextUsed,
          pageContextMode: replyMeta.pageContextMode,
          pageContextCacheHit: replyMeta.pageContextCacheHit,
          memorySource: replyMeta.memory?.source,
          memoryUpdatedKeys: replyMeta.memory?.updatedKeys ?? replyMeta.memory?.preferenceKeys,
          memoryConfidence: replyMeta.memory?.confidence,
        }
      : undefined;
  if (!base && !plannerMeta && !replyTelemetry) return undefined;
  return {
    ...(base ?? {}),
    ...(plannerMeta ?? {}),
    ...(replyTelemetry ?? {}),
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
      analysisCards?: unknown;
      memory?: unknown;
      pageContextUsed?: unknown;
      pageContextMode?: unknown;
      pageContextCacheHit?: unknown;
      costHints?: unknown;
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
      analysisCards: Array.isArray(candidate.analysisCards)
        ? (candidate.analysisCards as ChatbotAnalysisCard[]).slice(0, 8)
        : undefined,
      memory:
        candidate.memory && typeof candidate.memory === "object"
          ? {
              updated: Boolean((candidate.memory as { updated?: unknown }).updated),
              preferenceKeys: Array.isArray((candidate.memory as { preferenceKeys?: unknown }).preferenceKeys)
                ? ((candidate.memory as { preferenceKeys?: unknown[] }).preferenceKeys ?? [])
                    .filter((v): v is string => typeof v === "string")
                    .map((v) => v.trim().slice(0, 80))
                    .slice(0, 20)
                : undefined,
              summary:
                typeof (candidate.memory as { summary?: unknown }).summary === "string"
                  ? ((candidate.memory as { summary?: string }).summary ?? "").trim().slice(0, 500) || undefined
                  : undefined,
              source:
                (candidate.memory as { source?: unknown }).source === "state_merge" ||
                (candidate.memory as { source?: unknown }).source === "gemini_extractor" ||
                (candidate.memory as { source?: unknown }).source === "none"
                  ? ((candidate.memory as { source: "state_merge" | "gemini_extractor" | "none" }).source)
                  : undefined,
              ttlDays:
                typeof (candidate.memory as { ttlDays?: unknown }).ttlDays === "number" &&
                  Number.isFinite((candidate.memory as { ttlDays: number }).ttlDays)
                  ? clampNumber(Math.floor((candidate.memory as { ttlDays: number }).ttlDays), 1, 3650)
                  : undefined,
              updatedKeys: Array.isArray((candidate.memory as { updatedKeys?: unknown }).updatedKeys)
                ? ((candidate.memory as { updatedKeys?: unknown[] }).updatedKeys ?? [])
                    .filter((v): v is string => typeof v === "string")
                    .map((v) => v.trim().slice(0, 80))
                    .slice(0, 20)
                : undefined,
              confidence:
                typeof (candidate.memory as { confidence?: unknown }).confidence === "number" &&
                  Number.isFinite((candidate.memory as { confidence: number }).confidence)
                  ? clampNumber((candidate.memory as { confidence: number }).confidence, 0, 1)
                  : undefined,
              cleared:
                typeof (candidate.memory as { cleared?: unknown }).cleared === "boolean"
                  ? (candidate.memory as { cleared: boolean }).cleared
                  : undefined,
            }
          : undefined,
      pageContextUsed: typeof candidate.pageContextUsed === "boolean" ? candidate.pageContextUsed : undefined,
      pageContextMode: candidate.pageContextMode === "http" || candidate.pageContextMode === "headless" ? candidate.pageContextMode : undefined,
      pageContextCacheHit: typeof candidate.pageContextCacheHit === "boolean" ? candidate.pageContextCacheHit : undefined,
      costHints:
        candidate.costHints && typeof candidate.costHints === "object"
          ? {
              route:
                typeof (candidate.costHints as { route?: unknown }).route === "string"
                  ? ((candidate.costHints as { route?: string }).route ?? "").trim().slice(0, 80)
                  : "",
              multimodalUsed:
                typeof (candidate.costHints as { multimodalUsed?: unknown }).multimodalUsed === "boolean"
                  ? (candidate.costHints as { multimodalUsed: boolean }).multimodalUsed
                  : undefined,
              estimatedClass:
                (candidate.costHints as { estimatedClass?: unknown }).estimatedClass === "low" ||
                (candidate.costHints as { estimatedClass?: unknown }).estimatedClass === "medium" ||
                (candidate.costHints as { estimatedClass?: unknown }).estimatedClass === "high"
                  ? ((candidate.costHints as { estimatedClass: "low" | "medium" | "high" }).estimatedClass)
                  : undefined,
            }
          : undefined,
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
  const searchDrawerOpen = useUiStore((state) => state.searchDrawerOpen);
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

  const updateMessageById = useCallback((messageId: string, updater: (current: ChatMessage) => ChatMessage) => {
    setMessages((current) =>
      trimMessages(
        current.map((message) => {
          if (message.id !== messageId) return message;
          return updater(message);
        }),
      ),
    );
  }, []);

  const removeMessageById = useCallback((messageId: string) => {
    setMessages((current) => current.filter((message) => message.id !== messageId));
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
        | "tool_handoff_prefill_opened"
        | "multimodal_analysis_rendered"
        | "multimodal_analysis_clicked"
        | "page_fallback_used"
        | "page_fallback_failed"
        | "multimodal_cache_hit"
        | "multimodal_cache_miss"
        | "multimodal_on_demand_attempt"
        | "multimodal_on_demand_timeout"
        | "memory_extractor_used"
        | "memory_extractor_fallback"
        | "memory_cleared"
        | "memory_updated"
        | "planner_v2_plan_executed"
        | "planner_v2_clarify"
        | "stream_started"
        | "stream_completed"
        | "stream_failed",
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
    void resetAgencyChatbotMemory(sessionIdRef.current).then((cleared) => {
      if (!cleared) return;
      emitChatbotTelemetry("memory_cleared", {
        source: "edge",
        routeCategory: "edge_general",
        metadata: {
          cleared: true,
          memorySource: "reset_endpoint",
        },
      });
    });
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
        replaceMessageId?: string;
      },
    ) => {
      const messageId = telemetry?.replaceMessageId ?? createMessageId();
      const nextMessage: ChatMessage = {
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
        analysisCards: reply.analysisCards,
        memory: reply.memory,
        pageContextUsed: reply.pageContextUsed,
        pageContextMode: reply.pageContextMode,
        pageContextCacheHit: reply.pageContextCacheHit,
        costHints: reply.costHints,
        latencyMs: telemetry?.responseLatencyMs,
      };
      if (telemetry?.replaceMessageId) {
        updateMessageById(telemetry.replaceMessageId, () => nextMessage);
      } else {
        appendMessage(nextMessage);
      }

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
        metadata: mergeTelemetryMetadata(
          {
            estimatedCostClass: reply.costHints?.estimatedClass,
            multimodalUsed: reply.costHints?.multimodalUsed,
          },
          reply.planner,
          reply,
        ),
      });

      if (reply.pageContextUsed) {
        emitChatbotTelemetry("page_fallback_used", {
          messageId,
          requestId: reply.requestId,
          source: reply.source,
          edgeProvider: reply.edgeProvider,
          routeDecision: reply.routeDecision,
          routeCategory: reply.routeCategory,
          metadata: mergeTelemetryMetadata(
            {
              pageContextMode: reply.pageContextMode,
              pageContextCacheHit: reply.pageContextCacheHit,
            },
            reply.planner,
            reply,
          ),
        });
      }

      if (reply.planner?.mode === "gemini" && reply.planner.decisionType === "plan") {
        trackEvent("chatbot_planner_v2_plan_executed", {
          routeCategory: reply.routeCategory,
          edgeProvider: reply.edgeProvider,
        });
        emitChatbotTelemetry("planner_v2_plan_executed", {
          messageId,
          requestId: reply.requestId,
          source: reply.source,
          edgeProvider: reply.edgeProvider,
          routeDecision: reply.routeDecision,
          routeCategory: reply.routeCategory,
          metadata: mergeTelemetryMetadata(
            {
              plannerVersion: 2,
              plannerStepCount: reply.toolTrace?.length ?? 0,
            },
            reply.planner,
          ),
        });
      } else if (reply.planner?.mode === "gemini" && reply.planner.decisionType === "clarify") {
        trackEvent("chatbot_planner_v2_clarify", {
          routeCategory: reply.routeCategory,
          edgeProvider: reply.edgeProvider,
        });
        emitChatbotTelemetry("planner_v2_clarify", {
          messageId,
          requestId: reply.requestId,
          source: reply.source,
          edgeProvider: reply.edgeProvider,
          routeDecision: reply.routeDecision,
          routeCategory: reply.routeCategory,
          metadata: mergeTelemetryMetadata({ plannerVersion: 2 }, reply.planner),
        });
      }

      if (reply.analysisCards && reply.analysisCards.length > 0) {
        trackEvent("chatbot_multimodal_analysis_rendered", {
          source: reply.source,
          edgeProvider: reply.edgeProvider,
          count: reply.analysisCards.length,
        });
        emitChatbotTelemetry("multimodal_analysis_rendered", {
          messageId,
          requestId: reply.requestId,
          source: reply.source,
          edgeProvider: reply.edgeProvider,
          routeDecision: reply.routeDecision,
          routeCategory: reply.routeCategory,
          metadata: mergeTelemetryMetadata(
            {
              multimodalKinds: reply.analysisCards.map((card) => card.kind),
              analysisCacheHit: reply.analysisCards.every((card) => card.cacheHit !== false),
            },
            reply.planner,
            reply,
          ),
        });
        emitChatbotTelemetry(
          reply.analysisCards.some((card) => card.cacheHit === false) ? "multimodal_cache_miss" : "multimodal_cache_hit",
          {
            messageId,
            requestId: reply.requestId,
            source: reply.source,
            edgeProvider: reply.edgeProvider,
            routeDecision: reply.routeDecision,
            routeCategory: reply.routeCategory,
            metadata: mergeTelemetryMetadata(
              {
                analysisSourceKinds: reply.analysisCards.map((card) => card.sourceKind).filter(Boolean),
                analysisCacheHit: reply.analysisCards.every((card) => card.cacheHit !== false),
              },
              reply.planner,
              reply,
            ),
          },
        );
      }

      if (reply.memory?.updated) {
        trackEvent("chatbot_memory_updated", {
          source: reply.source,
          edgeProvider: reply.edgeProvider,
          updatedKeys: reply.memory.preferenceKeys?.length ?? 0,
        });
        emitChatbotTelemetry("memory_updated", {
          messageId,
          requestId: reply.requestId,
          source: reply.source,
          edgeProvider: reply.edgeProvider,
          routeDecision: reply.routeDecision,
          routeCategory: reply.routeCategory,
          metadata: mergeTelemetryMetadata(
            {
              memoryUpdatedKeys: reply.memory.updatedKeys ?? reply.memory.preferenceKeys ?? [],
            },
            reply.planner,
            reply,
          ),
        });
        if (reply.memory.source === "gemini_extractor") {
          emitChatbotTelemetry("memory_extractor_used", {
            messageId,
            requestId: reply.requestId,
            source: reply.source,
            edgeProvider: reply.edgeProvider,
            routeDecision: reply.routeDecision,
            routeCategory: reply.routeCategory,
            metadata: mergeTelemetryMetadata(undefined, reply.planner, reply),
          });
        } else if (reply.memory.source === "state_merge") {
          emitChatbotTelemetry("memory_extractor_fallback", {
            messageId,
            requestId: reply.requestId,
            source: reply.source,
            edgeProvider: reply.edgeProvider,
            routeDecision: reply.routeDecision,
            routeCategory: reply.routeCategory,
            metadata: mergeTelemetryMetadata(undefined, reply.planner, reply),
          });
        }
      }

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
    [appendMessage, emitChatbotTelemetry, updateMessageById],
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

    let streamedPlaceholderId: string | undefined;
    let usedStreaming = false;

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

      const shouldUseStreaming = CHATBOT_STREAMING_ENABLED && isEdgeChatStreamingEligible(params.actionRequest);
      usedStreaming = shouldUseStreaming;
      if (shouldUseStreaming) {
        trackEvent("chatbot_stream_started", {
          source: "site_chatbot",
          routeHint: params.actionRequest ? "edge_tools" : "edge_rag_or_general",
        });
        emitChatbotTelemetry("stream_started", {
          source: "edge",
          routeCategory: params.actionRequest ? "edge_tools" : undefined,
          requestChars: text.length,
        });
      }

      const requestPromise = shouldUseStreaming
        ? (async () => {
            streamedPlaceholderId = createMessageId();
            appendMessage({
              id: streamedPlaceholderId,
              role: "assistant",
              content: "",
              source: "edge",
            });
            let streamedContent = "";

            const reply = await askAgencyChatbotStream(
              {
                question: text,
                chatHistory,
                conversationState,
                actionRequest: params.actionRequest,
                sessionId: sessionIdRef.current,
                capabilities: {
                  stream: true,
                  multimodalCards: CHATBOT_MULTIMODAL_CARDS_ENABLED,
                },
                signal: controller.signal,
              },
              {
                onTextDelta: (delta) => {
                  streamedContent += delta;
                  if (!streamedPlaceholderId) return;
                  updateMessageById(streamedPlaceholderId, (current) => ({
                    ...current,
                    role: "assistant",
                    content: streamedContent,
                    source: "edge",
                  }));
                },
              },
            );
            return reply;
          })()
        : askAgencyChatbot({
            question: text,
            chatHistory,
            conversationState,
            actionRequest: params.actionRequest,
            sessionId: sessionIdRef.current,
            capabilities: {
              stream: false,
              multimodalCards: CHATBOT_MULTIMODAL_CARDS_ENABLED,
            },
            signal: controller.signal,
          });

      const reply = await Promise.race([requestPromise, timeoutPromise]);

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
        replaceMessageId: streamedPlaceholderId,
      });

      if (usedStreaming) {
        trackEvent("chatbot_stream_completed", {
          source: "site_chatbot",
          durationMs: Math.round(performance.now() - requestStartedAt),
        });
        emitChatbotTelemetry("stream_completed", {
          requestId: reply.requestId,
          source: "edge",
          edgeProvider: reply.edgeProvider,
          routeDecision: reply.routeDecision,
          routeCategory: reply.routeCategory,
          responseLatencyMs: Math.round(performance.now() - requestStartedAt),
          metadata: mergeTelemetryMetadata(
            {
              streamDurationMs: Math.round(performance.now() - requestStartedAt),
            },
            reply.planner,
          ),
        });
      }
    } catch (error) {
      if (requestSequenceRef.current !== nextRequestId) {
        return;
      }

      const aborted = error instanceof DOMException && error.name === "AbortError";

      if (usedStreaming && streamedPlaceholderId) {
        removeMessageById(streamedPlaceholderId);
      }

      toast.error(
        aborted
          ? "Le chatbot a pris trop de temps à répondre. Réessayez votre question."
          : "Le chatbot est momentanément indisponible.",
      );
      trackEvent("chatbot_request_failed", {
        source: "site_chatbot",
        aborted,
      });
      if (usedStreaming) {
        trackEvent("chatbot_stream_failed", {
          source: "site_chatbot",
          aborted,
        });
        emitChatbotTelemetry("stream_failed", {
          source: "edge",
          routeCategory: params.actionRequest ? "edge_tools" : undefined,
          routeDecision: aborted ? "stream_timeout" : "stream_error",
          responseLatencyMs: Math.round(performance.now() - requestStartedAt),
          requestChars: text.length,
          metadata: {
            aborted,
          },
        });
      }
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

  const buildLeadChatbotContext = useCallback(() => {
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    const selectedProperties = Array.from(
      new Set([
        ...(conversationState.selectedPropertyIds ?? []),
        ...(conversationState.recentSearch?.resultIds ?? []).slice(0, 5),
      ]),
    ).slice(0, 8);

    const toolSummary = lastAssistant
      ? {
          actionKinds: lastAssistant.actions?.map((action) => action.kind).slice(0, 8),
          requestId: lastAssistant.requestId,
          routeCategory: lastAssistant.routeCategory,
          edgeProvider: lastAssistant.edgeProvider,
        }
      : undefined;

    const multimodalHighlights = lastAssistant?.analysisCards?.slice(0, 4).map((card) => ({
      kind: card.kind,
      propertyId: card.propertyId,
      title: card.title,
      confidence: card.confidence,
    }));

    return {
      sessionId: sessionIdRef.current,
      conversationId: conversationIdRef.current,
      preferences: conversationState.preferences,
      qualification: {
        leadFormVisible: showLeadCapture,
        memorySummary: lastAssistant?.memory?.summary,
      },
      selectedProperties: selectedProperties.length > 0 ? selectedProperties : undefined,
      planner: lastAssistant?.planner,
      toolSummary,
      multimodalHighlights: multimodalHighlights && multimodalHighlights.length > 0 ? multimodalHighlights : undefined,
      sourceMetadata: {
        latestRequestId: lastAssistant?.requestId,
        latestRouteDecision: lastAssistant?.routeDecision,
        latestRouteCategory: lastAssistant?.routeCategory,
        latestRetrievalMode: lastAssistant?.retrievalMode,
        latestAgentMode: lastAssistant?.agentMode,
      },
    } satisfies NonNullable<Parameters<typeof submitLead>[0]["chatbotContext"]>;
  }, [conversationState, messages, showLeadCapture]);

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
        chatbotContext: buildLeadChatbotContext(),
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
    (event: MouseEvent<HTMLAnchorElement>, message: ChatMessage, citation: ChatbotCitation) => {
      const citationType = citation.kind === "web" ? "web" : "site";
      const citationTarget =
        citationType === "web" ? (citation.sourceUrl?.trim() || citation.path.trim()) : citation.path.trim();
      trackEvent("chatbot_citation_clicked", {
        citationPath: citation.path,
        citationType,
        citationTarget,
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
        citationPath: citation.path,
        metadata: {
          citationType,
          citationTarget,
        },
      });
      handleInternalPathClick(event, citation.path);
    },
    [emitChatbotTelemetry, handleInternalPathClick],
  );

  const handleExternalCitationClick = useCallback(
    (message: ChatMessage, citation: ChatbotCitation) => {
      const citationTarget = citation.sourceUrl?.trim() || citation.path.trim();
      trackEvent("chatbot_citation_clicked", {
        citationPath: citation.path,
        citationType: "web",
        citationTarget,
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
        citationPath: citation.path,
        metadata: {
          citationType: "web",
          citationTarget,
        },
      });
    },
    [emitChatbotTelemetry],
  );

  const handleAnalysisEvidenceClick = useCallback(
    (
      message: ChatMessage,
      card: ChatbotAnalysisCard,
      evidence: NonNullable<ChatbotAnalysisCard["evidence"]>[number],
    ) => {
      const targetUrl = evidence.sourceUrl || evidence.thumbnailUrl;
      if (!targetUrl) return;
      trackEvent("chatbot_multimodal_analysis_clicked", {
        kind: card.kind,
        propertyId: card.propertyId,
        routeCategory: message.routeCategory,
      });
      emitChatbotTelemetry("multimodal_analysis_clicked", {
        messageId: message.id,
        requestId: message.requestId,
        source: message.source ?? "edge",
        edgeProvider: message.edgeProvider,
        routeDecision: message.routeDecision,
        routeCategory: message.routeCategory,
        metadata: mergeTelemetryMetadata(
          {
            multimodalKind: card.kind,
            propertyId: card.propertyId,
            evidenceUrl: targetUrl,
          },
          message.planner,
        ),
      });
    },
    [emitChatbotTelemetry],
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

  const renderAnalysisCard = useCallback(
    (message: ChatMessage, card: ChatbotAnalysisCard) => {
      const kindLabel =
        card.kind === "property_photo_insights"
          ? "Photos"
          : card.kind === "property_plan_insights"
            ? "Plan"
            : card.kind === "property_document_summary"
              ? "Document"
              : "Points de vigilance";

      return (
        <div key={`${message.id}-analysis-${card.id}`} className="mt-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium">
              {kindLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">Bien #{card.propertyId}</span>
            {typeof card.confidence === "number" && (
              <span className="text-[10px] text-muted-foreground">
                Confiance: {Math.round(card.confidence * 100)}%
              </span>
            )}
            {card.stale && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700">
                Données à rafraîchir
              </span>
            )}
          </div>
          <p className="mt-2 font-medium">{card.title}</p>
          <p className="mt-1 whitespace-pre-line text-foreground/90">{card.summary}</p>
          {card.evidence && card.evidence.length > 0 && (
            <div className="mt-2 rounded-md border border-border/60 bg-card/80 px-2 py-2">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Éléments de preuve
              </p>
              <div className="space-y-1">
                {card.evidence.map((evidence, index) => {
                  const href = evidence.sourceUrl || evidence.thumbnailUrl;
                  const label =
                    evidence.label ||
                    (evidence.page ? `Page ${evidence.page}` : href ? `Source ${index + 1}` : `Élément ${index + 1}`);
                  if (!href) {
                    return (
                      <div key={`${card.id}-evidence-${index}`} className="text-[11px] text-muted-foreground">
                        {label}
                      </div>
                    );
                  }
                  return (
                    <a
                      key={`${card.id}-evidence-${index}`}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleAnalysisEvidenceClick(message, card, evidence)}
                      className="block rounded-md px-1.5 py-1 text-[11px] text-foreground hover:bg-muted"
                    >
                      <span className="font-medium">{label}</span>
                      {evidence.page ? <span className="ml-1 text-muted-foreground">(p.{evidence.page})</span> : null}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Synthèse IA informative: vérifiez toujours les documents officiels.
          </p>
        </div>
      );
    },
    [handleAnalysisEvidenceClick],
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
      {!searchDrawerOpen && open && (
        <button
          type="button"
          aria-label="Fermer le chatbot"
          className="fixed inset-0 z-[150] bg-black/20 backdrop-blur-[1px]"
          onClick={closeChat}
        />
      )}

      {!searchDrawerOpen && (
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

            {CHATBOT_PERSISTENT_MEMORY_ENABLED &&
              (conversationState.preferences?.city ||
              conversationState.preferences?.transaction ||
              conversationState.preferences?.type ||
              typeof conversationState.preferences?.bedroomsMin === "number" ||
              typeof conversationState.preferences?.priceMax === "number") && (
              <div className="border-b border-border/70 px-4 py-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-muted-foreground">Contexte mémorisé:</span>
                  {conversationState.preferences?.transaction && (
                    <span className="rounded-full border border-border bg-background px-2 py-0.5">
                      {conversationState.preferences.transaction === "vente" ? "Achat" : "Location"}
                    </span>
                  )}
                  {conversationState.preferences?.type && (
                    <span className="rounded-full border border-border bg-background px-2 py-0.5">
                      {conversationState.preferences.type === "maison_villa"
                        ? "Maison"
                        : conversationState.preferences.type === "appartement"
                          ? "Appartement"
                          : "Autre"}
                    </span>
                  )}
                  {conversationState.preferences?.city && (
                    <span className="rounded-full border border-border bg-background px-2 py-0.5">
                      {conversationState.preferences.city}
                    </span>
                  )}
                  {typeof conversationState.preferences?.bedroomsMin === "number" && (
                    <span className="rounded-full border border-border bg-background px-2 py-0.5">
                      {conversationState.preferences.bedroomsMin}+ ch.
                    </span>
                  )}
                  {typeof conversationState.preferences?.priceMax === "number" && (
                    <span className="rounded-full border border-border bg-background px-2 py-0.5">
                      Budget max {formatCompactPrice(conversationState.preferences.priceMax, "EUR")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setConversationState((current) =>
                        mergeConversationState(current, {
                          preferences: {},
                          selectedPropertyIds: [],
                        }),
                      )}
                    className="rounded-full border border-dashed border-border bg-background px-2 py-0.5 text-muted-foreground hover:bg-muted"
                  >
                    Effacer
                  </button>
                </div>
              </div>
            )}

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
                        Sources
                      </p>
                      <div className="space-y-1">
                        {message.citations.map((citation, index) => {
                          const citationKind = citation.kind === "web" ? "web" : "site";
                          const targetUrl = citationKind === "web" ? citation.sourceUrl || citation.path : citation.path;
                          const badgeLabel = citationKind === "web" ? "Web" : "Site";

                          if (citationKind === "web") {
                            return (
                              <a
                                key={`${message.id}-citation-${citation.path}-${index}`}
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleExternalCitationClick(message, citation)}
                                className="block rounded-md px-1.5 py-1 text-xs text-foreground hover:bg-muted"
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="font-medium">{citation.title || citation.path}</span>
                                  <span className="rounded border border-border/70 px-1 py-0 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                                    {badgeLabel}
                                  </span>
                                </span>
                                {citation.title && (
                                  <span className="ml-1 break-all text-muted-foreground">{citation.path}</span>
                                )}
                              </a>
                            );
                          }

                          return (
                            <Link
                              key={`${message.id}-citation-${citation.path}-${index}`}
                              to={citation.path}
                              onClick={(event) => handleCitationClick(event, message, citation)}
                              className="block rounded-md px-1.5 py-1 text-xs text-foreground hover:bg-muted"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <span className="font-medium">{citation.title || citation.path}</span>
                                <span className="rounded border border-border/70 px-1 py-0 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                                  {badgeLabel}
                                </span>
                              </span>
                              {citation.title && (
                                <span className="ml-1 text-muted-foreground">{citation.path}</span>
                              )}
                            </Link>
                          );
                        })}
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

                  {CHATBOT_MULTIMODAL_CARDS_ENABLED &&
                    message.role === "assistant" &&
                    message.analysisCards &&
                    message.analysisCards.length > 0 && (
                      <div>
                        {message.analysisCards.map((card) => renderAnalysisCard(message, card))}
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
      )}
    </>
  );
}
