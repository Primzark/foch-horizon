import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppFooter } from "@/layout/AppFooter";
import { AppHeader } from "@/layout/AppHeader";
import { SearchDrawer } from "@/features/listings/components/SearchDrawer";
import { RouteLoadingScreen } from "@/components/ui/RouteLoadingScreen";
import { BackToTopButton } from "@/components/ui/BackToTopButton";
import { SiteChatbot } from "@/features/content/components/SiteChatbot";

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isRouteLoading && <RouteLoadingScreen fullscreen className="z-[95]" />}
      <AppHeader />
      <main>{children}</main>
      <AppFooter />
      <SearchDrawer />
      <BackToTopButton />
      <SiteChatbot />
    </div>
  );
}
