import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ExternalLink, Menu, Phone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <header className={headerClass}>
        <div className="container mx-auto flex items-center justify-between px-4">
          <SheetTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
              aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>

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
                <span className="font-sans text-[1.45rem] font-semibold leading-none tracking-tight">
                  <span className="text-[#000000]">Foch</span>
                  <span className="text-[#2eca6a]">Immobilier</span>
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
                        "hover:border-border hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        isActive && "border-border bg-muted",
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </SheetClose>
              ))}

              <SheetClose asChild>
                <Link
                  to="/estimation"
                  className="mt-2 rounded-lg border border-border px-3 py-3 text-[1rem] font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Estimer mon bien
                </Link>
              </SheetClose>

              <SheetClose asChild>
                <a
                  href="https://extranet2.ics.fr"
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
