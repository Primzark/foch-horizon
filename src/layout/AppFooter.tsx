import { ExternalLink, MapPin, Phone, Mail, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics/events";

const legalLinks = [
  { href: "/honoraires", label: "Honoraires" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
  { href: "/accessibilite", label: "Accessibilité" },
  { href: "/plan-du-site", label: "Plan du site" },
];

const quickLinks = [
  { href: "/", label: "Accueil" },
  { href: "/biens", label: "Biens" },
  { href: "/vendre", label: "Vendre" },
  { href: "/services", label: "Services" },
  { href: "/apropos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl">Foch Immobilier</p>
          <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">Depuis 1972 · Réseau UNIS</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Transaction, location et administration de biens au Havre et dans sa région.
          </p>
          <a
            href="https://extranet2.ics.fr"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-1 text-sm hover:underline"
            title="Vous quittez le site"
            onClick={() => trackEvent("extranet_clicked", { source: "footer" })}
          >
            Extranet
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-muted-foreground">Navigation</p>
          <ul className="space-y-2 text-sm">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link to={link.href} className="hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-muted-foreground">Coordonnées</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4" />
              <span>
                109 Av. Foch
                <br />
                76600 Le Havre
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a href="tel:0235420001" onClick={() => trackEvent("phone_clicked", { source: "footer" })}>
                02 35 42 00 01
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href="mailto:contact@foch-immobilier.fr">contact@foch-immobilier.fr</a>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4" />
              <span>Lun-Ven : 9h-12h30, 14h-18h30 · Samedi sur rendez-vous</span>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-muted-foreground">Conformité</p>
          <ul className="space-y-2 text-sm">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link to={link.href} className="hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Foch Immobilier. CPI et mentions contractuelles disponibles dans les mentions légales.
      </div>
    </footer>
  );
}
