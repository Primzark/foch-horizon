import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useLocation } from "react-router-dom";
import { BotMessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/state/useUiStore";

type SiteChatbotComponent = typeof import("@/features/content/components/SiteChatbot")["SiteChatbot"];

export function SiteChatbotLoader() {
  const location = useLocation();
  const searchDrawerOpen = useUiStore((state) => state.searchDrawerOpen);
  const [Chatbot, setChatbot] = useState<ComponentType | null>(null);
  const chatbotImport = useRef<Promise<void> | null>(null);
  const pendingOpen = useRef(false);
  const isHomePage = location.pathname === "/";

  const loadChatbot = useCallback((openOnLoad = false) => {
    if (openOnLoad) pendingOpen.current = true;
    if (Chatbot || chatbotImport.current) return;

    chatbotImport.current = import("@/features/content/components/SiteChatbot")
      .then((module) => setChatbot(() => module.SiteChatbot))
      .catch(() => {
        chatbotImport.current = null;
      });
  }, [Chatbot]);

  useEffect(() => {
    if (Chatbot) return;

    const handleOpenAssistant = () => loadChatbot(true);
    window.addEventListener("foch:open-assistant", handleOpenAssistant);
    return () => window.removeEventListener("foch:open-assistant", handleOpenAssistant);
  }, [Chatbot, loadChatbot]);

  useEffect(() => {
    if (!Chatbot || !pendingOpen.current) return;

    const frame = window.requestAnimationFrame(() => {
      pendingOpen.current = false;
      window.dispatchEvent(new Event("foch:open-assistant"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [Chatbot]);

  if (Chatbot) return <Chatbot />;
  if (searchDrawerOpen) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-[160] max-w-[calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-1.5rem)]",
        isHomePage && "flex w-[min(420px,calc(100vw-1.5rem))] flex-col items-end",
      )}
    >
      <Button
        type="button"
        variant="brand"
        className="h-10 max-w-[13.5rem] rounded-full px-3 text-xs shadow-card sm:h-12 sm:max-w-none sm:px-4 sm:text-sm"
        onClick={() => loadChatbot(true)}
        aria-haspopup="dialog"
      >
        <BotMessageSquare className="mr-1 h-4 w-4" />
        <span className="sm:hidden">Assistant IA</span>
        <span className="hidden sm:inline">Assistant immobilier IA</span>
        <Sparkles className="ml-1 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
