import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BotMessageSquare, Heart, Menu, Phone, Search } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useFavoritesStore } from "@/features/favorites/useFavoritesStore";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/state/useUiStore";
import { trackEvent } from "@/lib/analytics/events";
import { primaryLinks, openSiteAssistant } from "@/layout/navigation";
import { preloadSiteChatbot } from "@/features/content/components/siteChatbotPreload";

export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);
  const favoriteIds = useFavoritesStore((state) => state.ids);

  useEffect(() => setMobileOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const prewarmAssistant = () => {
    void preloadSiteChatbot().catch(() => undefined);
  };

  const assistantButton = (mobile = false) => (
    <button
      type="button"
      className={cn("inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-soft px-4 py-2.5 text-sm font-medium text-brand-strong transition-colors hover:bg-brand-soft/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand", mobile && "mt-2 justify-center py-3")}
      onClick={() => { setMobileOpen(false); openSiteAssistant(); }}
      onPointerEnter={prewarmAssistant}
      onPointerDown={prewarmAssistant}
      onFocus={prewarmAssistant}
      aria-haspopup="dialog"
    >
      <BotMessageSquare className="h-4 w-4" aria-hidden="true" /> Mon assistant IA
    </button>
  );

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md [padding-top:env(safe-area-inset-top)]">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex min-h-20 items-center justify-between gap-2 lg:min-h-[72px]">
            <SheetTrigger asChild>
              <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border lg:hidden" aria-label="Ouvrir le menu" aria-expanded={mobileOpen}>
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="Foch Immobilier — Accueil">
              <picture>
                <source srcSet="/images/foch-immobilier-logo.webp" type="image/webp" />
                <img
                  src="/images/foch-immobilier-logo.jpg"
                  alt="Foch Immobilier"
                  width={500}
                  height={146}
                  className="h-auto w-[124px] mix-blend-multiply sm:w-[145px] lg:w-[160px]"
                  decoding="async"
                />
              </picture>
            </Link>
            <p className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground lg:block">Immobilier au Havre · Depuis 1972</p>
            <div className="flex shrink-0 items-center gap-2">
              <a href="tel:0235425176" className="hidden items-center gap-2 text-sm hover:text-brand-strong md:inline-flex" aria-label="Appeler l'agence au 02 35 42 51 76">
                <Phone className="h-4 w-4" /><span className="hidden xl:inline">02 35 42 51 76</span>
              </a>
              <NavLink to="/biens-sauvegardes" className="inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-brand-border bg-brand-soft px-2 text-brand-strong" aria-label={`Biens sauvegardés (${favoriteIds.length})`} onClick={() => trackEvent("favorites_opened", { source: "header" })}>
                <Heart className={cn("h-4 w-4", favoriteIds.length > 0 && "fill-brand")} /><span className="hidden text-xs sm:inline">{favoriteIds.length}</span>
              </NavLink>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border" aria-label="Ouvrir la recherche de biens" onClick={() => { setSearchDrawerOpen(true); trackEvent("search_opened", { source: "header" }); }}>
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
          <nav aria-label="Navigation principale" className="hidden min-h-[60px] items-center justify-center gap-4 border-t border-border/70 lg:flex xl:gap-7">
            {primaryLinks.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => cn("whitespace-nowrap px-1 py-3 text-sm font-medium transition-colors hover:text-brand-strong", isActive ? "text-brand-strong underline underline-offset-8" : "text-foreground/80")}>
                {item.label}
              </NavLink>
            ))}
            {assistantButton()}
          </nav>
        </div>
      </header>
      <SheetContent side="left" className="flex h-dvh w-[88vw] max-w-[360px] flex-col bg-background p-0 lg:hidden">
        <SheetTitle className="border-b border-border px-5 py-6 font-display text-2xl">Foch Immobilier</SheetTitle>
        <nav aria-label="Navigation mobile" className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-3">
          {primaryLinks.map((item) => (
            <SheetClose asChild key={item.to}>
              <NavLink to={item.to} end={item.to === "/"} className={({ isActive }) => cn("rounded-lg px-3 py-3 font-medium hover:bg-brand-soft", isActive && "bg-brand-soft text-brand-strong")}>{item.label}</NavLink>
            </SheetClose>
          ))}
          {assistantButton(true)}
        </nav>
        <div className="border-t border-border px-5 py-4 text-sm">
          <p>109 Av. Foch, 76600 Le Havre</p>
          <a href="tel:0235425176" className="mt-2 block">02 35 42 51 76</a>
          <a href="mailto:vendre@fochimmobilier.com" className="block">vendre@fochimmobilier.com</a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
