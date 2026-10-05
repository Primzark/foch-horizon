import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { BotMessageSquare, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/state/useUiStore";
import { preloadSiteChatbot } from "@/features/content/components/siteChatbotPreload";

type SiteChatbotComponent = Awaited<ReturnType<typeof preloadSiteChatbot>>["SiteChatbot"];

export function SiteChatbotLoader() {
  const location = useLocation();
  const searchDrawerOpen = useUiStore((state) => state.searchDrawerOpen);
  const [Chatbot, setChatbot] = useState<SiteChatbotComponent | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadRequest = useRef<Promise<void> | null>(null);
  const isHomePage = location.pathname === "/";

  const openAssistant = useCallback(() => {
    if (Chatbot) {
      window.dispatchEvent(new Event("foch:open-assistant"));
      return;
    }

    setPendingOpen(true);
    setLoadError(false);
    if (loadRequest.current) return;

    setIsLoading(true);
    const request = preloadSiteChatbot()
      .then((module) => setChatbot(() => module.SiteChatbot))
      .catch(() => setLoadError(true))
      .finally(() => {
        loadRequest.current = null;
        setIsLoading(false);
      });
    loadRequest.current = request;
  }, [Chatbot]);

  useEffect(() => {
    if (Chatbot) return;

    window.addEventListener("foch:open-assistant", openAssistant);
    return () => window.removeEventListener("foch:open-assistant", openAssistant);
  }, [Chatbot, openAssistant]);

  useEffect(() => {
    if (!Chatbot || !pendingOpen) return;

    const frame = window.requestAnimationFrame(() => setPendingOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [Chatbot, pendingOpen]);

  const closePendingOpen = () => {
    setPendingOpen(false);
    setLoadError(false);
  };

  const prewarm = () => {
    void preloadSiteChatbot().catch(() => undefined);
  };

  if (Chatbot) return <Chatbot initiallyOpen={pendingOpen} />;
  if (searchDrawerOpen) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-[160] flex max-w-[calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-1.5rem)] flex-col items-end",
        isHomePage && "w-[min(420px,calc(100vw-1.5rem))]",
      )}
    >
      {pendingOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le chatbot"
            className="fixed inset-0 z-[150] bg-black/20"
            onClick={closePendingOpen}
          />
          <section
            role="dialog"
            aria-labelledby="assistant-opening-title"
            aria-busy={isLoading}
            className={cn(
              "pointer-events-auto relative z-[160] mb-3 flex max-h-[calc(100dvh-5.5rem)] w-[min(94vw,420px)] flex-col rounded-2xl border border-border bg-card shadow-card max-sm:w-full",
              isHomePage && "w-full min-w-0 max-w-full",
            )}
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Assistant IA</p>
                <h2 id="assistant-opening-title" className="font-display text-xl sm:text-2xl">
                  Chatbot immobilier Le Havre
                </h2>
              </div>
              <Button type="button" variant="outline" size="icon" aria-label="Fermer le chatbot" onClick={closePendingOpen}>
                <X className="h-4 w-4" />
              </Button>
            </header>

            <div className="min-h-24 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <p className="max-w-[92%] rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
                Bonjour 👋 Je prépare votre assistant immobilier…
              </p>
              {loadError ? (
                <div role="alert" className="space-y-2 text-sm">
                  <p>L’assistant n’a pas pu être chargé.</p>
                  <Button type="button" variant="outline" size="sm" onClick={openAssistant}>
                    Réessayer
                  </Button>
                </div>
              ) : (
                <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  {isLoading ? "Ouverture de l’assistant…" : "Connexion en cours…"}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border px-3 py-3">
              <div aria-hidden="true" className="h-10 flex-1 rounded-md border border-input bg-background" />
              <Button type="button" variant="brand" size="icon" disabled aria-label="Chargement de l’assistant">
                <BotMessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </>
      )}

      {!pendingOpen && (
        <Button
          type="button"
          variant="brand"
          className="h-11 w-11 rounded-full p-0 text-xs shadow-card sm:h-12 sm:w-auto sm:max-w-none sm:px-4 sm:text-sm"
          onClick={openAssistant}
          onPointerEnter={prewarm}
          onPointerDown={prewarm}
          onFocus={prewarm}
          aria-haspopup="dialog"
          aria-label="Assistant immobilier IA"
        >
          <BotMessageSquare className="h-4 w-4 sm:mr-1" />
          <span className="sr-only sm:not-sr-only">Assistant immobilier IA</span>
          <Sparkles className="hidden h-3.5 w-3.5 sm:ml-1 sm:block" />
        </Button>
      )}
    </div>
  );
}
