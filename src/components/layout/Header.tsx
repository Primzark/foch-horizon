import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: "Acheter", href: "/buy" },
    { label: "Louer", href: "/rent" },
    { label: "Vendre", href: "/sell/valuation" },
    { label: "L'agence", href: "/agency/about", children: [
      { label: "À propos", href: "/agency/about" },
      { label: "Notre équipe", href: "/agency/agents" },
    ]},
    { label: "Actualités", href: "/insights" },
    { label: "Contact", href: "/contact" },
  ];

  const isActive = (href: string) => location.pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-card/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-tight text-primary lg:text-2xl">
              Foch Immobilier
            </span>
            <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground lg:block">
              Le Havre · Depuis 1972
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <div key={item.href} className="group relative">
              <Link
                to={item.href}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-accent",
                  isActive(item.href) ? "text-accent" : "text-foreground/80"
                )}
              >
                {item.label}
                {item.children && <ChevronDown className="h-3 w-3" />}
              </Link>
              {item.children && (
                <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                  <div className="rounded-lg border border-border bg-card p-2 shadow-card">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        className="block rounded-md px-4 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-accent"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden items-center gap-3 lg:flex">
          <a href="tel:0235420001" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-accent">
            <Phone className="h-4 w-4" />
            02 35 42 00 01
          </a>
          <Link to="/sell/valuation">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-gold font-medium">
              Estimer mon bien
            </Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden text-foreground"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card lg:hidden">
          <nav className="container mx-auto flex flex-col gap-1 px-4 py-4">
            {navItems.map((item) => (
              <div key={item.href}>
                <Link
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(item.href) ? "bg-muted text-accent" : "text-foreground/80 hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
                {item.children?.map((child) => (
                  <Link
                    key={child.href}
                    to={child.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-6 py-2 text-sm text-muted-foreground hover:bg-muted"
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="mt-2 border-t border-border pt-3">
              <Link to="/sell/valuation" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  Estimer mon bien
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
