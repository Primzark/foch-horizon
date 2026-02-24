import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppFooter } from "@/layout/AppFooter";
import { AppHeader } from "@/layout/AppHeader";
import { RouteLoadingScreen } from "@/components/ui/RouteLoadingScreen";
import { useUiStore } from "@/lib/state/useUiStore";

const SearchDrawer = lazy(async () => {
  const module = await import("@/features/listings/components/SearchDrawer");
  return { default: module.SearchDrawer };
});

const SiteChatbot = lazy(async () => {
  const module = await import("@/features/content/components/SiteChatbot");
  return { default: module.SiteChatbot };
});

function scheduleIdleTask(callback: () => void, timeoutMs: number): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = window.setTimeout(callback, Math.min(timeoutMs, 1200));
  return () => window.clearTimeout(timeoutId);
}

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const searchDrawerOpen = useUiStore((state) => state.searchDrawerOpen);
  const [shouldMountSearchDrawer, setShouldMountSearchDrawer] = useState(searchDrawerOpen);
  const [shouldMountChatbot, setShouldMountChatbot] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setIsRouteLoading(true);
    const timer = window.setTimeout(() => setIsRouteLoading(false), 520);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (searchDrawerOpen) {
      setShouldMountSearchDrawer(true);
    }
  }, [searchDrawerOpen]);

  useEffect(() => {
    if (shouldMountSearchDrawer) {
      return;
    }

    return scheduleIdleTask(() => setShouldMountSearchDrawer(true), 2200);
  }, [shouldMountSearchDrawer]);

  useEffect(() => {
    if (shouldMountChatbot || typeof window === "undefined") {
      return;
    }

    const activate = () => setShouldMountChatbot(true);
    const cancelIdle = scheduleIdleTask(activate, 4500);

    window.addEventListener("pointerdown", activate, { once: true, passive: true });
    window.addEventListener("keydown", activate, { once: true });
    window.addEventListener("scroll", activate, { once: true, passive: true });

    return () => {
      cancelIdle();
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("keydown", activate);
      window.removeEventListener("scroll", activate);
    };
  }, [shouldMountChatbot]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isRouteLoading && <RouteLoadingScreen fullscreen className="z-[95]" />}
      <AppHeader />
      <main>{children}</main>
      <AppFooter />
      <Suspense fallback={null}>{shouldMountSearchDrawer ? <SearchDrawer /> : null}</Suspense>
      <Suspense fallback={null}>{shouldMountChatbot ? <SiteChatbot /> : null}</Suspense>
    </div>
  );
}
