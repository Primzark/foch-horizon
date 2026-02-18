import { FormEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BotMessageSquare, Mail, Send, Sparkles, X } from "lucide-react";
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

const initialMessage: ChatMessage = {
  id: "init-assistant",
  role: "assistant",
  content:
    "Bonjour, je suis l'assistant immobilier Foch. Je peux vous aider sur les biens, quartiers du Havre, services et etapes de vente/achat.",
  suggestedPrompts: chatbotExamplePrompts,
};

const CHATBOT_REQUEST_TIMEOUT_MS = 18000;

export function SiteChatbot() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
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
  const routeChangeFromChatRef = useRef(false);

  const conversation = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  const cancelPendingRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const closeChat = useCallback(() => {
    cancelPendingRequest();
    requestSequenceRef.current += 1;
    setLoading(false);
    setLeadLoading(false);
    setShowLeadCapture(false);
    setOpen(false);
  }, [cancelPendingRequest]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, showLeadCapture]);

  useEffect(() => {
    cancelPendingRequest();
    requestSequenceRef.current += 1;
    setLoading(false);
    setLeadLoading(false);

    if (routeChangeFromChatRef.current) {
      setOpen(false);
      setShowLeadCapture(false);
      routeChangeFromChatRef.current = false;
    }
  }, [location.pathname, location.search, cancelPendingRequest]);

  useEffect(() => {
    return () => {
      cancelPendingRequest();
    };
  }, [cancelPendingRequest]);

  const pushAssistantReply = (reply: ChatbotReply) => {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply.answer,
        propertySuggestions: reply.propertySuggestions,
        suggestedPrompts: reply.suggestedPrompts,
      },
    ]);

    if (reply.needsLeadCapture) {
      setShowLeadCapture(true);
    }
  };

  const sendMessage = async (value: string) => {
    const text = value.trim();
    if (!text) return;

    cancelPendingRequest();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const nextRequestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = nextRequestId;
    const chatHistory = [...conversation.slice(-7), { role: "user" as const, content: text }];
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, CHATBOT_REQUEST_TIMEOUT_MS);

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: text }]);
    setInput("");
    setShowLeadCapture(false);
    setLoading(true);

    try {
      const reply = await askAgencyChatbot({
        question: text,
        chatHistory,
        signal: controller.signal,
      });

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
    } finally {
      window.clearTimeout(timeoutId);

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

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Votre demande a ete transmise a l'agence. Un conseiller vous enverra une selection de biens adaptes par email.",
        },
      ]);

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

  const handlePropertySuggestionClick = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    event.preventDefault();
    routeChangeFromChatRef.current = true;
    closeChat();
    navigate(path);
  };

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-[130]">
      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-auto mb-3 w-[min(94vw,420px)] rounded-2xl border border-border bg-card shadow-card"
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assistant IA</p>
                <h2 className="font-display text-2xl">Chatbot immobilier Le Havre</h2>
              </div>
              <button
                type="button"
                aria-label="Fermer le chatbot"
                className="rounded-full border border-border p-1.5"
                onClick={closeChat}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div ref={scrollRef} className="max-h-[56vh] space-y-3 overflow-y-auto px-4 py-4">
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
                  <p>{message.content}</p>

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
                          className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground/90 hover:bg-muted"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              ))}

              {loading && (
                <div className="max-w-[70%] rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Analyse de votre demande...
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
      </AnimatePresence>

      <Button
        type="button"
        className="h-12 rounded-full px-4 shadow-card"
        onClick={() => {
          if (open) {
            closeChat();
            return;
          }

          setOpen(true);
        }}
      >
        {open ? <X className="mr-1 h-4 w-4" /> : <BotMessageSquare className="mr-1 h-4 w-4" />}
        {open ? "Fermer" : "Chat immobilier IA"}
        <Sparkles className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
