import { LeadForm } from "@/features/leads/components/LeadForm";
import { useSeo } from "@/lib/seo/useSeo";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";

export default function EstimationPageV2() {
  useSeo({
    title: "Avis de valeur | Foch Immobilier",
    description: "Demandez un avis de valeur argumenté pour votre bien avec un conseiller Foch Immobilier.",
    canonicalPath: "/estimation",
  });

  return (
    <>
      <StorefrontPageHero
        title="Avis de valeur"
        description="Décrivez votre bien et vos contraintes de calendrier. Un conseiller dédié vous recontacte avec un avis de valeur argumenté."
      />

      <section className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-strong">En toute confidentialité</p>
          <blockquote className="mt-3 font-display text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl">
            <p className="font-sans text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Le cabinet Foch Immobilier accompagne chaque client avec rigueur et bienveillance, qu’il s’agisse d’un premier achat, d’un investissement ou d’une vente patrimoniale.
            </p>
            <p className="mt-5">
              N’hésitez pas à{" "}
            <span className="text-brand-strong">
              y faire estimer gracieusement votre bien
            </span>{" "}
            et ce en toute confidentialité.
            </p>
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
