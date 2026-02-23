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
  { href: "/histoire-immobilier-le-havre", label: "Le Havre & patrimoine" },
  { href: "/avis", label: "Avis clients" },
  { href: "/biens-sauvegardes", label: "Biens sauvegardés" },
  { href: "/vendre", label: "Vendre" },
  { href: "/services", label: "Services" },
  { href: "/apropos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="h-px w-full accent-divider" />
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="h-card" itemScope itemType="https://schema.org/RealEstateAgent">
          <meta itemProp="name" content="Foch Immobilier" />
          <meta itemProp="url" content="https://fochimmobilier.lovable.app" />
          <p className="font-display text-2xl">Foch Immobilier</p>
          <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">Depuis 1972 · Réseau UNIS</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Immobilier résidentiel haut de gamme, location et gestion locative au Havre et sur le littoral.
          </p>
          <a
            href="https://extranet2.ics.fr/V5/connexion-wolh.html"
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
            <li className="flex items-start gap-2 p-adr h-adr">
              <MapPin className="mt-0.5 h-4 w-4" />
              <span>
                <span className="p-street-address" itemProp="streetAddress">109 Av. Foch</span>
                <br />
                <span className="p-postal-code" itemProp="postalCode">76600</span>{" "}
                <span className="p-locality" itemProp="addressLocality">Le Havre</span>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a
                href="tel:0235425176"
                className="p-tel"
                itemProp="telephone"
                onClick={() => trackEvent("phone_clicked", { source: "footer" })}
              >
                02 35 42 51 76
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href="mailto:vendre@fochimmobilier.com" className="u-email break-all" itemProp="email">
                vendre@fochimmobilier.com
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4" />
              <span>Lun-Ven : 09:30-12:00, 14:00-18:30 · Samedi sur rendez-vous</span>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-muted-foreground">Informations légales</p>
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
        © {new Date().getFullYear()} Foch Immobilier. Carte professionnelle CPI et mentions contractuelles disponibles dans les mentions légales.
      </div>
    </footer>
  );
}
