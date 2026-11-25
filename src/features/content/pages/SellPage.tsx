import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo/useSeo";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";

export default function SellPage() {
  useSeo({
    title: "Vendre un bien au Havre et à Sainte-Adresse | Foch Immobilier",
    description: "Vendez votre bien au Havre ou à Sainte-Adresse avec un conseiller Foch Immobilier, de l’avis de valeur jusqu’à la signature.",
    canonicalPath: "/vendre",
  });

  return (
    <>
      <StorefrontPageHero
        title="Vendre votre bien au Havre"
        titleClassName="text-4xl sm:text-5xl md:text-6xl"
        description="Vous vendez une maison ou un appartement au Havre ou à Sainte-Adresse ? Notre équipe vous accompagne du choix du prix de mise en vente jusqu’à la signature."
      >
        <Button asChild variant="brand" className="mt-5">
          <Link to="/estimation">Demander un avis de valeur</Link>
        </Button>
      </StorefrontPageHero>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-10 md:py-14">
        <section aria-labelledby="vente-etapes">
          <h2 id="vente-etapes" className="font-display text-3xl">Les étapes de la vente</h2>
          <ol className="mt-4 list-decimal divide-y divide-border pl-5 text-sm leading-relaxed text-muted-foreground">
            <li className="py-3">
              <strong className="text-foreground">Préparer la mise en vente.</strong>{" "}
              Avec votre conseiller, définissez le prix envisagé, rassemblez les documents du bien et convenez des conditions de mise en vente.
            </li>
            <li className="py-3">
              <strong className="text-foreground">Présenter le bien et organiser les visites.</strong>{" "}
              Nous mettons en avant les caractéristiques du logement, organisons les visites et vous transmettons les retours des acquéreurs.
            </li>
            <li className="py-3">
              <strong className="text-foreground">Examiner les offres et suivre la vente.</strong>{" "}
              Votre conseiller vous aide à examiner les conditions des offres et suit le dossier jusqu’à la signature chez le notaire.
            </li>
          </ol>
        </section>

        <section aria-labelledby="vente-dossier" className="border-t border-border pt-7">
          <h2 id="vente-dossier" className="font-display text-3xl">Préparer votre dossier vendeur</h2>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Avant le premier échange, repérez les documents dont vous disposez déjà, comme le titre de propriété, les diagnostics ou les informations de copropriété. Le conseiller pourra vous indiquer les pièces à compléter selon votre situation.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
            <li><Link to="/reglementation-immobiliere#reg-seller" className="text-brand-strong underline underline-offset-4">Documents et diagnostics</Link></li>
            <li><Link to="/honoraires" className="text-brand-strong underline underline-offset-4">Consulter nos honoraires</Link></li>
            <li><Link to="/immobilier/le-havre" className="text-brand-strong underline underline-offset-4">Les quartiers du Havre</Link></li>
          </ul>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/contact">Échanger avec un conseiller</Link>
          </Button>
        </section>
      </div>
    </>
  );
}
