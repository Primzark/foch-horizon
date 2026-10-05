import { LeadForm } from "@/features/leads/components/LeadForm";
import { useSeo } from "@/lib/seo/useSeo";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";

const gallieniReferenceUrl = "https://gallieni-location.fr/page/a-vendre";

export default function EstimationPageV2() {
  useSeo({
    title: "Avis de valeur | Foch Immobilier",
    description: "Demandez un avis de valeur argumenté pour votre bien avec un conseiller Foch Immobilier.",
    canonicalPath: "/estimation",
  });

  return (
    <>
      <StorefrontPageHero
        eyebrow="Votre projet de vente"
        title="Avis de valeur"
        description="Décrivez votre bien et vos contraintes de calendrier. Un conseiller dédié vous recontacte avec un avis de valeur argumenté."
      />

      <section className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-strong">En toute confidentialité</p>
          <blockquote className="mt-3 font-display text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl">
            N’hésitez pas à{" "}
            <a
              href={gallieniReferenceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand-strong underline decoration-brand/50 underline-offset-4 hover:decoration-brand"
            >
              y faire estimer gracieusement votre bien
            </a>{" "}
            et ce en toute confidentialité.
          </blockquote>
        </div>

        <div className="mx-auto mt-8 max-w-3xl border-t border-border pt-8 md:mt-10 md:pt-10">
          <LeadForm
            source="estimation"
            title="Demander un avis de valeur"
            description="Nous revenons vers vous sous 24h ouvrées."
            ctaLabel="Recevoir mon avis de valeur"
            showAppointmentFields
            variant="plain"
            disableMotion
          />
        </div>
      </section>
    </>
  );
}
