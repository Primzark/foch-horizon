import { LeadForm } from "@/features/leads/components/LeadForm";
import { useSeo } from "@/lib/seo/useSeo";
import { AgencyPageHeader } from "@/features/content/components/AgencyPageHeader";

export default function EstimationPageV2() {
  useSeo({
    title: "Avis de valeur | Foch Immobilier",
    description: "Demandez un avis de valeur argumenté pour votre bien avec un conseiller Foch Immobilier.",
    canonicalPath: "/estimation",
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <AgencyPageHeader
        eyebrow="Votre projet de vente"
        title="Avis de valeur"
        description="Décrivez votre bien et vos contraintes de calendrier. Un conseiller dédié vous recontacte avec un avis de valeur argumenté."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
        <article className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <h2 className="font-display text-2xl text-foreground">Comment cela fonctionne</h2>
          <ol className="mt-4 space-y-3">
            <li>1. Analyse détaillée des caractéristiques du bien (surface, adresse, état, prestations).</li>
            <li>2. Étude des transactions comparables au Havre et sur son littoral.</li>
            <li>3. Restitution d'une fourchette de prix et d'une stratégie de commercialisation sur mesure.</li>
          </ol>
          <blockquote className="mt-8 border-l-2 border-brand pl-4 font-display text-lg leading-relaxed text-foreground">
            « N’hésitez pas à y faire estimer gracieusement votre bien et ce en toute confidentialité. »
          </blockquote>
          <p className="mt-2 text-xs">
            <a href="https://gallieni-location.fr/page/a-vendre" target="_blank" rel="noreferrer" className="underline underline-offset-2">Gallieni Immobilier · À Vendre</a>
          </p>
        </article>

        <LeadForm
          source="estimation"
          title="Demander un avis de valeur"
          description="Nous revenons vers vous sous 24h ouvrées."
          ctaLabel="Recevoir mon avis de valeur"
          showAppointmentFields
        />
      </div>
    </section>
  );
}
