import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ExternalLink, Heart, Menu, Phone, Search } from "lucide-react";
import { GoogleGIcon } from "@/components/branding/GoogleGIcon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useFavoritesStore } from "@/features/favorites/useFavoritesStore";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/state/useUiStore";
import { trackEvent } from "@/lib/analytics/events";

const primaryLinks = [
  { to: "/biens", label: "Biens" },
  { to: "/vendre", label: "Vendre" },
  { to: "/biens?transaction=location", label: "Louer" },
  { to: "/histoire-immobilier-le-havre", label: "Histoire" },
  { to: "/avis", label: "Avis", google: true },
  { to: "/apropos", label: "Agence" },
  { to: "/contact", label: "Contact" },
];
const fiLogoUrl = "https://www.fochimmobilier.com/static/img/favicon.png";
const legacyLogoUrl = "https://www.fochimmobilier.com/static/img/logo_unis.png";

function LinkItem({
  to,
  label,
  google,
  onClick,
  className,
}: {
  to: string;
  label: string;
  google?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group relative inline-flex items-center gap-1.5 px-2 py-1 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground",
          isActive && "text-brand-strong",
          className,
        )
      }
    >
      {google && (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border/80 bg-background/80">
          <GoogleGIcon size={12} decorative />
        </span>
      )}
      {label}
      <span className="absolute -bottom-0.5 left-2 h-px w-0 bg-brand transition-all duration-200 group-hover:w-[calc(100%-1rem)]" />
    </NavLink>
  );
}

function SelectionLink({
  count,
  onClick,
  className,
}: {
  count: number;
  onClick?: () => void;
  className?: string;
}) {
  const itemLabel = count > 1 ? "biens" : "bien";

  return (
    <NavLink
      to="/biens-sauvegardes"
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-brand-border bg-brand-soft px-3 text-brand-strong shadow-[0_8px_24px_hsl(var(--brand)/0.16)] transition-colors hover:bg-brand-soft/70",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/80 focus-visible:ring-offset-2",
          isActive && "border-brand/60 bg-brand-soft/60",
          className,
        )
      }
      aria-label={`Biens sauvegardés (${count} ${itemLabel})`}
    >
      <Heart className={cn("h-5 w-5 text-brand", count > 0 && "fill-brand")} />
      <span className="text-xs font-semibold leading-none tabular-nums max-[390px]:hidden">{count}</span>
    </NavLink>
  );
}

export function AppHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);
  const favoriteIds = useFavoritesStore((state) => state.ids);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const headerClass = useMemo(
    () =>
      cn(
        "sticky top-0 z-50 [padding-top:env(safe-area-inset-top)] transition-all duration-200",
        scrolled || mobileOpen
          ? "border-b border-border/70 bg-background/85 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70"
          : "border-b border-transparent bg-transparent py-3",
      ),
    [mobileOpen, scrolled],
  );

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <header className={headerClass}>
        <div className="container mx-auto flex items-center justify-between gap-1.5 px-2.5 sm:gap-2 sm:px-4">
          <SheetTrigger asChild>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
              aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileOpen}
            >
              <Menu className="h-[1.28rem] w-[1.28rem]" />
            </button>
          </SheetTrigger>

          <Link to="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <img
              src={fiLogoUrl}
              alt="FI logo"
              className="h-7 w-7 rounded-[0.45rem] sm:h-8 sm:w-8"
              loading="eager"
              decoding="async"
            />
            <span
              className={cn(
                "whitespace-nowrap font-display text-[1.34rem] font-semibold leading-none tracking-tight transition-all duration-200 sm:text-[1.56rem] md:text-[2rem]",
                scrolled && "text-[1.16rem] sm:text-[1.36rem] md:text-[1.66rem]",
              )}
            >
              <span className="text-[#000000]">Foch</span>
              <span className="text-[#2ca46d] max-[360px]:hidden">Immobilier</span>
              <span className="hidden text-[#2ca46d] max-[360px]:inline">Immo</span>
            </span>
            <img
              src={legacyLogoUrl}
              alt="Réseau UNIS"
              className={cn("hidden w-auto md:inline-block md:h-[30px]", scrolled && "md:h-7")}
              loading="eager"
              decoding="async"
            />
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">
            {primaryLinks.map((item) => (
              <LinkItem key={item.to} to={item.to} label={item.label} google={item.google} />
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <SelectionLink
              count={favoriteIds.length}
              className="max-[390px]:h-10 max-[390px]:min-w-10 max-[390px]:gap-0 max-[390px]:px-0"
              onClick={() => trackEvent("favorites_opened", { source: "header" })}
            />
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 transition-colors hover:border-brand-border hover:bg-brand-soft/70 sm:h-10 sm:w-10"
              aria-label="Ouvrir la recherche de biens"
              onClick={() => {
                setSearchDrawerOpen(true);
                trackEvent("search_opened", { source: "header" });
              }}
            >
              <Search className="h-4 w-4" />
            </button>
            <a
              href="tel:0235425176"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 transition-colors hover:border-brand-border hover:bg-brand-soft/70 md:inline-flex"
              aria-label="Appeler l'agence"
              onClick={() => trackEvent("phone_clicked", { source: "header" })}
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href="https://extranet2.ics.fr/V5/connexion-wolh.html"
              target="_blank"
              rel="noreferrer noopener"
              className="hidden items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
              title="Vous quittez le site"
              onClick={() => trackEvent("extranet_clicked")}
            >
              Extranet
              <ExternalLink className="h-3 w-3" />
            </a>
            <Link to="/estimation" className="hidden md:block">
              <Button variant="brand" className="rounded-full px-5">
                Estimer votre bien
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <SheetContent
        side="left"
        className="h-dvh w-[88vw] max-w-[360px] border-r border-border bg-background p-0 text-foreground lg:hidden"
      >
        <SheetTitle className="sr-only">Menu principal</SheetTitle>

        <div className="flex h-full flex-col">
          <div className="border-b border-border px-5 py-5">
            <SheetClose asChild>
              <Link to="/" className="inline-flex items-center gap-2">
                <span className="font-display text-[1.45rem] font-semibold leading-none tracking-tight">
                  <span className="text-[#000000]">Foch</span>
                  <span className="text-[#2ca46d]">Immobilier</span>
                </span>
              </Link>
            </SheetClose>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <div className="flex flex-col gap-2">
              {primaryLinks.map((item) => (
                <SheetClose asChild key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg border border-transparent px-3 py-3 text-[1rem] font-semibold text-foreground transition-colors",
                        "hover:border-brand-border hover:bg-brand-soft/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/80",
                        isActive && "border-brand-border bg-brand-soft text-brand-strong",
                      )
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      {item.google && (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background/80">
                          <GoogleGIcon size={13} decorative />
                        </span>
                      )}
                      {item.label}
                    </span>
                  </NavLink>
                </SheetClose>
              ))}

              <SelectionLink
                count={favoriteIds.length}
                className="mt-1 h-12 rounded-full px-4 shadow-none"
                onClick={() => {
                  setMobileOpen(false);
                  trackEvent("favorites_opened", { source: "mobile_menu" });
                }}
              />

              <SheetClose asChild>
                <Button asChild variant="brand" className="mt-2 h-auto rounded-lg px-3 py-3 text-[1rem] font-semibold">
                  <Link to="/estimation">Estimer votre bien</Link>
                </Button>
              </SheetClose>

              <SheetClose asChild>
                <a
                  href="https://extranet2.ics.fr/V5/connexion-wolh.html"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-3 text-[1rem] font-medium text-foreground transition-colors hover:bg-muted"
                  title="Vous quittez le site"
                  onClick={() => trackEvent("extranet_clicked", { source: "mobile_menu" })}
                >
                  Extranet
                  <ExternalLink className="h-4 w-4" />
                </a>
              </SheetClose>
            </div>
          </nav>

          <div className="border-t border-border px-5 py-4 text-sm text-foreground/90">
            <p>109 Av. Foch, 76600 Le Havre</p>
            <a href="tel:0235425176" className="mt-1 block text-foreground hover:underline">
              02 35 42 51 76
            </a>
            <a href="mailto:vendre@fochimmobilier.com" className="block text-foreground hover:underline">
              vendre@fochimmobilier.com
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
