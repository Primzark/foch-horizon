import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LeadForm } from "@/features/leads/components/LeadForm";
import { useSeo } from "@/lib/seo/useSeo";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";

export default function EstimationPageV2() {
  useSeo({
    title: "Estimation immobilière au Havre | Foch Immobilier",
    description: "Demandez un avis de valeur argumenté pour votre bien au Havre et sur le littoral avec un conseiller Foch Immobilier.",
    canonicalPath: "/estimation",
  });

  return (
    <>
      <StorefrontPageHero
        title="Estimation immobilière au Havre"
        description="Vous envisagez de vendre une maison ou un appartement ? Foch Immobilier vous propose un avis de valeur gratuit et confidentiel pour vous aider à fixer un prix de mise en vente."
      >
        <Button asChild variant="brand" className="mt-5">
          <a href="#demande-estimation">Demander une estimation</a>
        </Button>
      </StorefrontPageHero>

      <div className="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-2 lg:gap-16 lg:py-14">
        <div className="space-y-9">
          <section aria-labelledby="estimation-processus">
            <h2 id="estimation-processus" className="font-display text-3xl">Le déroulement de l’estimation</h2>
            <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>
                <strong className="text-foreground">Décrivez votre bien.</strong>{" "}
                Indiquez dans votre message le quartier, le type de bien, la surface, le nombre de pièces et votre calendrier.
              </li>
              <li>
                <strong className="text-foreground">Échangez avec votre conseiller.</strong>{" "}
                L’état, les travaux, le diagnostic de performance énergétique et les charges de copropriété, si vous les connaissez, affinent la comparaison.
              </li>
              <li>
                <strong className="text-foreground">Recevez un avis de valeur argumenté.</strong>{" "}
                Votre conseiller vous explique les comparaisons retenues et le prix de mise en vente envisagé.
              </li>
            </ol>
          </section>

          <section aria-labelledby="estimation-criteres">
            <h2 id="estimation-criteres" className="font-display text-3xl">Les critères d’estimation au Havre</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Pour un appartement du centre-ville, l’étage, l’ascenseur et les charges peuvent faire la différence. Près de la plage, l’exposition et la vue sont aussi à examiner. Pour une maison à Sainte-Adresse, le terrain, le stationnement et les travaux à prévoir aident à comparer les biens.
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
              <li><Link to="/immobilier/centre-ville" className="text-brand-strong underline underline-offset-4">Centre-ville du Havre</Link></li>
              <li><Link to="/immobilier/sainte-adresse" className="text-brand-strong underline underline-offset-4">Sainte-Adresse</Link></li>
              <li><Link to="/vendre" className="text-brand-strong underline underline-offset-4">Les étapes de la vente</Link></li>
            </ul>
          </section>
        </div>

        <section id="demande-estimation" aria-label="Demander un avis de valeur" className="min-w-0 scroll-mt-32 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <LeadForm
            source="estimation"
            title="Demander un avis de valeur"
            description="Nous revenons vers vous sous 24h ouvrées."
            ctaLabel="Recevoir mon avis de valeur"
            showAppointmentFields
            variant="plain"
            disableMotion
          />
        </section>
      </div>
    </>
  );
}
