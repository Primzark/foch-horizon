import { MapPin, Clock, Phone, Mail } from "lucide-react";
import { LeadForm } from "@/features/leads/components/LeadForm";
import { useSeo } from "@/lib/seo/useSeo";
import { trackEvent } from "@/lib/analytics/events";

export default function ContactPageV2() {
  useSeo({
    title: "Contact | Foch Immobilier",
    description: "Contactez Foch Immobilier au 109 Av. Foch, 76600 Le Havre.",
    canonicalPath: "/contact",
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contact</p>
        <h1 className="mt-2 font-display text-4xl">Nous contacter</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Nous répondons à toutes les demandes de transaction, location et gestion dans les meilleurs délais.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-2xl">Coordonnées agence</h2>
          <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4" />
              <span>
                109 Av. Foch<br />
                76600 Le Havre
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a href="tel:0235420001" onClick={() => trackEvent("phone_clicked", { source: "contact_page" })}>
                02 35 42 00 01
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href="mailto:contact@foch-immobilier.fr">contact@foch-immobilier.fr</a>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4" />
              <span>
                Lundi à vendredi : 9h-12h30, 14h-18h30
                <br />
                Samedi : sur rendez-vous
              </span>
            </li>
          </ul>

          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <iframe
              title="Carte Foch Immobilier"
              src="https://maps.google.com/maps?q=109%20Avenue%20Foch%2C%20Le%20Havre&t=&z=14&ie=UTF8&iwloc=&output=embed"
              className="h-64 w-full"
              loading="lazy"
            />
          </div>
        </section>

        <LeadForm
          source="contact_page"
          title="Envoyer un message"
          description="Un conseiller vous rappelle ou vous répond par email selon votre préférence."
          ctaLabel="Transmettre"
        />
      </div>
    </section>
  );
}
