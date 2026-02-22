import { MapPin, Clock, Phone, Mail } from "lucide-react";
import { LeadForm } from "@/features/leads/components/LeadForm";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { trackEvent } from "@/lib/analytics/events";

export default function ContactPageV2() {
  const siteUrl = getSiteUrl();

  useSeo({
    title: "Contact | Foch Immobilier",
    description: "Contactez Foch Immobilier, votre agence immobilière au Havre depuis 1972.",
    canonicalPath: "/contact",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name: "Foch Immobilier",
      url: `${siteUrl}/contact`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "109 Av. Foch",
        postalCode: "76600",
        addressLocality: "Le Havre",
        addressCountry: "FR",
      },
      telephone: "+33235425176",
      email: "vendre@fochimmobilier.com",
    },
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contact</p>
        <h1 className="mt-2 font-display text-4xl">Parlons de votre projet immobilier</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Nous répondons rapidement à vos demandes de vente, d'achat, de location et de gestion locative.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 h-card" itemScope itemType="https://schema.org/RealEstateAgent">
          <meta itemProp="name" content="Foch Immobilier" />
          <meta itemProp="url" content="https://fochimmobilier.lovable.app" />
          <h2 className="font-display text-2xl">Coordonnées de l'agence</h2>
          <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
            <li className="flex items-start gap-2 p-adr h-adr" itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
              <MapPin className="mt-0.5 h-4 w-4" />
              <span>
                <span className="p-street-address" itemProp="streetAddress">109 Av. Foch</span><br />
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
                onClick={() => trackEvent("phone_clicked", { source: "contact_page" })}
              >
                02 35 42 51 76
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href="mailto:vendre@fochimmobilier.com" className="u-email" itemProp="email">
                vendre@fochimmobilier.com
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4" />
              <span>
                Lundi à vendredi : 09:30-12:00, 14:00-18:30
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
            title="Écrire à l'agence"
            description="Un conseiller dédié vous répond par téléphone ou par email selon votre préférence."
            ctaLabel="Envoyer ma demande"
          />
      </div>
    </section>
  );
}
