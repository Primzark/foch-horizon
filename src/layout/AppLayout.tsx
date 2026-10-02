import { Suspense, useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { PageBreadcrumbs } from "@/layout/PageBreadcrumbs";
import { AppFooter } from "@/layout/AppFooter";
import { AppHeader } from "@/layout/AppHeader";
import { SearchDrawer } from "@/features/listings/components/SearchDrawer";
import { RouteLoadingScreen } from "@/components/ui/RouteLoadingScreen";
import { BackToTopButton } from "@/components/ui/BackToTopButton";
import { SiteChatbotLoader } from "@/features/content/components/SiteChatbotLoader";

function RouteReadyMarker({
  locationKey,
  hash,
  onReady,
}: {
  locationKey: string;
  hash: string;
  onReady: (key: string) => void;
}) {
  useLayoutEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" });
    onReady(locationKey);
  }, [hash, locationKey, onReady]);
  return null;
}

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const [readyLocationKey, setReadyLocationKey] = useState<string | null>(null);
  const previousLocation = useRef(location);
  const scrollPositions = useRef(new Map<string, number>());
  const pendingScroll = useRef<{ key: string; hash?: string; top?: number } | null>(null);
  const isRouteLoading = readyLocationKey !== location.key;

  const markRouteReady = useCallback((key: string) => {
    const pending = pendingScroll.current;
    if (pending?.key === key) {
      if (pending.hash) {
        document.getElementById(decodeURIComponent(pending.hash.slice(1)))?.scrollIntoView({ block: "start" });
      } else {
        window.scrollTo({ top: pending.top ?? 0, left: 0, behavior: "auto" });
      }
      pendingScroll.current = null;
    }
    setReadyLocationKey(key);
  }, []);

  useLayoutEffect(() => {
    const originalRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = originalRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    const previous = previousLocation.current;
    const locationChanged = previous.key !== location.key;
    const pathChanged = previous.pathname !== location.pathname;

    if (locationChanged) scrollPositions.current.set(previous.key, window.scrollY);

    if (locationChanged) {
      if (location.hash) {
        pendingScroll.current = { key: location.key, hash: location.hash };
      } else if (navigationType === "POP") {
        pendingScroll.current = { key: location.key, top: scrollPositions.current.get(location.key) ?? 0 };
      } else if (pathChanged) {
        pendingScroll.current = { key: location.key, top: 0 };
      }
    }

    previousLocation.current = location;
  }, [location, navigationType]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isRouteLoading && (
        <div className="fixed inset-0 z-[200]">
          <RouteLoadingScreen fullscreen />
        </div>
      )}
      <AppHeader />
      <main>
        <Suspense fallback={null}>
          {children}
          <RouteReadyMarker locationKey={location.key} hash={location.hash} onReady={markRouteReady} />
        </Suspense>
        <PageBreadcrumbs />
      </main>
      <AppFooter />
      <SearchDrawer />
      <BackToTopButton />
      <SiteChatbotLoader />
    </div>
  );
}
