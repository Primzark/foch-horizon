import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
const legacyLogoUrl = "https://www.fochimmobilier.com/static/img/logo_unis.png";

function LinkItem({
  to,
  label,
  onClick,
  className,
}: {
  to: string;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group relative px-2 py-1 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground",
          isActive && "text-foreground",
          className,
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
  const location = useLocation();
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (!mobileOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlHeight = html.style.height;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyLeft = body.style.left;
    const previousBodyRight = body.style.right;
    const previousBodyWidth = body.style.width;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.height = previousHtmlHeight;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.left = previousBodyLeft;
      body.style.right = previousBodyRight;
      body.style.width = previousBodyWidth;
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

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
        "sticky top-0 z-50 transition-all duration-200",
        scrolled || mobileOpen
          ? "border-b border-border/70 bg-background/85 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70"
          : "border-b border-transparent bg-transparent py-3",
      ),
    [mobileOpen, scrolled],
  );

  return (
    <header className={headerClass}>
      <div className="container mx-auto flex items-center justify-between px-4">
        <button
          type="button"
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden",
            mobileOpen ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground",
          )}
          onClick={() => setMobileOpen((current) => !current)}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
          <span
            className={cn(
              "font-sans text-[1.8rem] font-semibold leading-none tracking-tight transition-all duration-200 md:text-[2rem]",
              scrolled && "text-[1.55rem] md:text-[1.7rem]",
            )}
          >
            <span className="text-[#000000]">Foch</span>
            <span className="text-[#2eca6a]">Immobilier</span>
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
        <div className="fixed inset-0 z-40 overflow-y-auto bg-background pt-[76px] lg:hidden">
          <nav className="mx-auto flex w-full max-w-[720px] flex-col gap-2 px-5 pb-10">
            {primaryLinks.map((item) => (
              <LinkItem
                key={item.to}
                to={item.to}
                label={item.label}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-base font-semibold text-foreground hover:bg-muted"
              />
            ))}
            <Link
              to="/estimation"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-border px-3 py-2 text-base font-semibold text-foreground"
            >
              Estimer mon bien
            </Link>
            <a
              href="https://extranet2.ics.fr"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-base text-foreground"
              title="Vous quittez le site"
              onClick={() => {
                setMobileOpen(false);
                trackEvent("extranet_clicked", { source: "mobile_menu" });
              }}
            >
              Extranet
              <ExternalLink className="h-4 w-4" />
            </a>
            <div className="mt-4 border-t border-border pt-4 text-sm text-foreground/85">
              <p>109 Av. Foch, 76600 Le Havre</p>
              <a href="tel:0235425176" className="block text-foreground hover:underline">
                02 35 42 51 76
              </a>
              <a href="mailto:vendre@fochimmobilier.com" className="block text-foreground hover:underline">
                vendre@fochimmobilier.com
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
