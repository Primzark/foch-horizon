import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="font-display text-xl font-bold">Foch Immobilier</h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.15em] text-primary-foreground/60">
              Depuis 1972 · Membre UNIS
            </p>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/70">
              Votre partenaire immobilier de confiance au Havre et ses environs. Achat, vente, location : un accompagnement sur mesure.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/50">Navigation</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Acheter", href: "/buy" },
                { label: "Louer", href: "/rent" },
                { label: "Estimer mon bien", href: "/sell/valuation" },
                { label: "L'agence", href: "/agency/about" },
                { label: "Actualités", href: "/insights" },
                { label: "Contact", href: "/contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-primary-foreground/70 transition-colors hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/50">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-primary-foreground/70">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>42 avenue Foch<br />76600 Le Havre</span>
              </li>
              <li>
                <a href="tel:0235420001" className="flex items-center gap-2.5 text-sm text-primary-foreground/70 hover:text-accent">
                  <Phone className="h-4 w-4 text-accent" />
                  02 35 42 00 01
                </a>
              </li>
              <li>
                <a href="mailto:contact@foch-immobilier.fr" className="flex items-center gap-2.5 text-sm text-primary-foreground/70 hover:text-accent">
                  <Mail className="h-4 w-4 text-accent" />
                  contact@foch-immobilier.fr
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-primary-foreground/70">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>Lun-Ven : 9h-12h30, 14h-18h30<br />Sam : 9h30-12h30</span>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground/50">Informations légales</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Barème d'honoraires", href: "/legal/fees" },
                { label: "Politique de confidentialité", href: "/legal/privacy" },
                { label: "Gestion des cookies", href: "/legal/cookies" },
                { label: "Mentions légales", href: "/legal/notice" },
              ].map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-primary-foreground/70 transition-colors hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/10 pt-6 text-center text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} Foch Immobilier — Tous droits réservés. Carte professionnelle CPI 7602 2024 000 000 délivrée par la CCI Le Havre.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
