import { FormEvent, Fragment, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BotMessageSquare, Mail, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  askAgencyChatbot,
  chatbotExamplePrompts,
  type ChatbotPropertySuggestion,
  type ChatbotReply,
} from "@/features/content/api/chatbot.service";
import { submitLead } from "@/features/leads/api/leads.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  propertySuggestions?: ChatbotPropertySuggestion[];
  suggestedPrompts?: string[];
}

interface OpeningGreetingVariant {
  content: string;
  prompts: string[];
}

const initialMessage: ChatMessage = {
  id: "init-assistant",
  role: "assistant",
  content:
    "Bonjour 👋 Je suis l'assistant immobilier Foch. Je peux vous aider sur les biens, quartiers du Havre, services et etapes de vente/achat.",
  suggestedPrompts: chatbotExamplePrompts,
};

const openingGreetingVariants: OpeningGreetingVariant[] = [
  {
    content: "Bonjour 👋 Sur quoi avancez-vous aujourd'hui: achat, vente, location ou estimation ?",
    prompts: [
      "Je cherche un appartement a vendre au Havre",
      "Je veux vendre mon bien",
      "Montrez-moi les avis clients",
      "Je veux une estimation",
    ],
  },
  {
    content: "Ravi de vous revoir 😊 Quel est votre objectif immobilier du moment ?",
    prompts: [
      "Je cherche une maison familiale a Sanvic",
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
    content: "Hello 🙂 Vous cherchez plutot un bien, une info quartier ou une aide process ?",
    prompts: [
      "Quel quartier du Havre est le plus adapte pour un investissement locatif ?",
      "Je cherche un T3 avec balcon",
      "Ou trouver les honoraires ?",
      "Je ne trouve pas de bien adapte",
    ],
  },
  {
    content: "Bonjour 🤝 Je peux vous orienter rapidement: annonces, avis, histoire locale, estimation, contact.",
    prompts: [
      "Voir toutes les annonces",
      "Resumer les avis clients",
      "Je veux estimer mon bien",
      "Je veux parler a un conseiller",
    ],
  },
];

const CHATBOT_STORAGE_KEY = "foch_chatbot_messages_v1";
const CHATBOT_STORAGE_VERSION = 1;
const CHATBOT_REQUEST_TIMEOUT_MS = 18000;
const CHATBOT_HARD_UNLOCK_MS = 32000;
const CHATBOT_MEMORY_LIMIT = 44;
const CHATBOT_HISTORY_LIMIT = 16;
const CHATBOT_MIN_REPLY_DELAY_MS = 900;
const CHATBOT_MAX_REPLY_DELAY_MS = 2600;

const internalPathSplitPattern = /(\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?)/gi;
const internalPathMatchPattern = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*(?:\?[a-z0-9=&_-]+)?$/i;

function createMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `chat-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizePromptList(prompts: string[]): string[] {
  return prompts.map((prompt) => prompt.trim()).filter((prompt) => prompt.length > 0).slice(0, 6);
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
      suggestedPrompts?: unknown;
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
      suggestedPrompts: sanitizePromptList(candidate.suggestedPrompts),
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

  const conversation = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => trimMessages([...current, message]));
  }, []);

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
    setLeadForm({ firstName: "", lastName: "", email: "", criteria: "" });
    setMessages([nextOpeningGreetingMessage()]);
    toast.success("Nouvelle conversation initialisee.");
  }, [nextOpeningGreetingMessage, unlockRequestState]);

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

  const pushAssistantReply = useCallback(
    (reply: ChatbotReply) => {
      appendMessage({
        id: createMessageId(),
        role: "assistant",
        content: reply.answer,
        propertySuggestions: reply.propertySuggestions,
        suggestedPrompts: reply.suggestedPrompts,
      });

      if (reply.needsLeadCapture) {
        setShowLeadCapture(true);
      }
    },
    [appendMessage],
  );

  const sendMessage = async (value: string) => {
    const text = value.trim();
    if (!text || loading) return;

    cancelPendingRequest();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const nextRequestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = nextRequestId;

    const chatHistory = [...conversation.slice(-CHATBOT_HISTORY_LIMIT), { role: "user" as const, content: text }];

    appendMessage({ id: createMessageId(), role: "user", content: text });
    setInput("");
    setShowLeadCapture(false);
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
        toast.error("Le chatbot met trop de temps a repondre. Vous pouvez relancer votre question.");
      }, CHATBOT_HARD_UNLOCK_MS);

      const reply = await Promise.race([
        askAgencyChatbot({
          question: text,
          chatHistory,
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

      pushAssistantReply(reply);
    } catch (error) {
      if (requestSequenceRef.current !== nextRequestId) {
        return;
      }

      const aborted = error instanceof DOMException && error.name === "AbortError";

      toast.error(
        aborted
          ? "Le chatbot a pris trop de temps a repondre. Reessayez votre question."
          : "Le chatbot est momentanement indisponible.",
      );

      appendMessage({
        id: createMessageId(),
        role: "assistant",
        content:
          "Je reste disponible pour vous aider. Reformulez votre demande et je vous reponds sur les biens, quartiers, services et etapes de votre projet au Havre.",
        suggestedPrompts: chatbotExamplePrompts,
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
        message: `Demande chatbot - aucun bien trouve\n\nCriteres: ${leadForm.criteria}`,
        consent: true,
      });

      appendMessage({
        id: createMessageId(),
        role: "assistant",
        content:
          "Votre demande a ete transmise a l'agence. Un conseiller vous enverra une selection de biens adaptes par email.",
      });

      setLeadForm({ firstName: "", lastName: "", email: "", criteria: "" });
      setShowLeadCapture(false);
      toast.success("Demande envoyee a l'agence.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de transmettre votre demande.";
      toast.error(message);
    } finally {
      setLeadLoading(false);
    }
  };

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

  const openChatWithGreeting = () => {
    if (open) {
      closeChat();
      return;
    }

    setOpen(true);
    appendMessage(nextOpeningGreetingMessage());
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
                  aria-label="Reinitialiser la conversation"
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
                  Laissez votre email et vos criteres: la demande part automatiquement a l'agence.
                </p>

                <form onSubmit={handleLeadSubmit} className="mt-3 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Prenom"
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
                    {leadLoading ? "Transmission..." : "Envoyer a l'agence"}
                  </Button>
                </form>
              </section>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border px-4 py-3">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Posez une question sur les biens, quartiers ou process..."
                disabled={loading}
              />
              <Button type="submit" size="icon" disabled={loading || input.trim().length === 0}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
        </motion.section>
      )}

      <Button
        type="button"
        className="h-10 max-w-[13.5rem] rounded-full px-3 text-xs shadow-card sm:h-12 sm:max-w-none sm:px-4 sm:text-sm"
        onClick={openChatWithGreeting}
      >
        {open ? <X className="mr-1 h-4 w-4" /> : <BotMessageSquare className="mr-1 h-4 w-4" />}
        <span className="sm:hidden">{open ? "Fermer" : "Chat IA"}</span>
        <span className="hidden sm:inline">{open ? "Fermer" : "Chat immobilier IA"}</span>
        <Sparkles className="ml-1 h-3.5 w-3.5" />
      </Button>
      </div>
    </>
  );
}
