import { LeadForm } from "@/features/leads/components/LeadForm";
import { useSeo } from "@/lib/seo/useSeo";

export default function EstimationPageV2() {
  useSeo({
    title: "Estimation | Foch Immobilier",
    description: "Demandez une estimation immobilière argumentée avec un conseiller Foch Immobilier.",
    canonicalPath: "/estimation",
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Estimation</p>
        <h1 className="mt-2 font-display text-4xl">Estimer votre bien</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Décrivez votre bien et vos contraintes de calendrier. Un conseiller dédié vous recontacte avec une estimation argumentée.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
        <article className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <h2 className="font-display text-2xl text-foreground">Comment cela fonctionne</h2>
          <ol className="mt-4 space-y-3">
            <li>1. Analyse détaillée des caractéristiques du bien (surface, adresse, état, prestations).</li>
            <li>2. Étude des transactions comparables au Havre et sur son littoral.</li>
            <li>3. Restitution d'une fourchette de prix et d'une stratégie de commercialisation sur mesure.</li>
          </ol>
        </article>

        <LeadForm
          source="estimation"
          title="Lancer votre demande d'estimation"
          description="Nous revenons vers vous sous 24h ouvrées."
          ctaLabel="Recevoir mon estimation"
          showAppointmentFields
        />
      </div>
    </section>
  );
}
