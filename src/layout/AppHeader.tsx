import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ExternalLink, Menu, Phone, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/state/useUiStore";
import { trackEvent } from "@/lib/analytics/events";

const primaryLinks = [
  { to: "/biens", label: "Biens" },
  { to: "/vendre", label: "Vendre" },
  { to: "/biens?transaction=location", label: "Louer" },
  { to: "/apropos", label: "L'agence" },
  { to: "/contact", label: "Contact" },
];
const legacyFiLogoUrl = "https://www.fochimmobilier.com/static/img/favicon.png";
const legacyLogoUrl = "https://www.fochimmobilier.com/static/img/logo_unis.png";

function LinkItem({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group relative px-2 py-1 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground",
          isActive && "text-foreground",
        )
      }
    >
      {label}
      <span className="absolute -bottom-0.5 left-2 h-px w-0 bg-foreground/80 transition-all duration-200 group-hover:w-[calc(100%-1rem)]" />
    </NavLink>
  );
}

export function AppHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClass = useMemo(
    () =>
      cn(
        "sticky top-0 z-50 transition-all duration-200",
        scrolled
          ? "border-b border-border/70 bg-background/85 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70"
          : "border-b border-transparent bg-transparent py-3",
      ),
    [scrolled],
  );

  return (
    <header className={headerClass}>
      <div className="container mx-auto flex items-center justify-between px-4">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 lg:hidden"
          onClick={() => setMobileOpen((current) => !current)}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
          <img
            src={legacyFiLogoUrl}
            alt="Logo FI Foch Immobilier"
            className={cn("h-7 w-7 rounded-sm sm:h-8 sm:w-8", scrolled && "h-6 w-6 sm:h-7 sm:w-7")}
            loading="eager"
            decoding="async"
          />
          <span className={cn("font-display text-xl tracking-tight transition-all duration-200 sm:text-2xl", scrolled && "text-lg sm:text-xl")}>
            <span className="text-[#000000]">Foch</span>
            <span className="text-[#2eca6a]">Immobilier</span>
          </span>
          <img
            src={legacyLogoUrl}
            alt="Réseau UNIS"
            className={cn("hidden w-auto md:inline-block md:h-7 lg:h-8", scrolled && "md:h-6 lg:h-7")}
            loading="eager"
            decoding="async"
          />
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {primaryLinks.map((item) => (
            <LinkItem key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90"
            aria-label="Ouvrir la recherche"
            onClick={() => {
              setSearchDrawerOpen(true);
              trackEvent("search_opened", { source: "header" });
            }}
          >
            <Search className="h-4 w-4" />
          </button>
          <a
            href="tel:0235425176"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 md:inline-flex"
            aria-label="Appeler l'agence"
            onClick={() => trackEvent("phone_clicked", { source: "header" })}
          >
            <Phone className="h-4 w-4" />
          </a>
          <a
            href="https://extranet2.ics.fr"
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
            <Button className="rounded-full px-5">Estimer mon bien</Button>
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 top-[64px] z-40 bg-background/95 px-5 pb-8 pt-6 backdrop-blur lg:hidden">
          <nav className="flex flex-col gap-2">
            {primaryLinks.map((item) => (
              <LinkItem key={item.to} to={item.to} label={item.label} onClick={() => setMobileOpen(false)} />
            ))}
            <Link
              to="/estimation"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium"
            >
              Estimer mon bien
            </Link>
            <a
              href="https://extranet2.ics.fr"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              title="Vous quittez le site"
              onClick={() => {
                setMobileOpen(false);
                trackEvent("extranet_clicked", { source: "mobile_menu" });
              }}
            >
              Extranet
              <ExternalLink className="h-4 w-4" />
            </a>
            <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
              <p>109 Av. Foch, 76600 Le Havre</p>
              <a href="tel:0235425176" className="block hover:text-foreground">
                02 35 42 51 76
              </a>
              <a href="mailto:vendre@fochimmobilier.com" className="block hover:text-foreground">
                vendre@fochimmobilier.com
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
