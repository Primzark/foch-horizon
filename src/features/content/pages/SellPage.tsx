import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo/useSeo";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";

export default function SellPage() {
  useSeo({
    title: "Vendre | Foch Immobilier",
    description: "Un accompagnement haut de gamme et structuré pour vendre votre bien au Havre et sur le littoral.",
    canonicalPath: "/vendre",
  });

  return (
    <>
      <StorefrontPageHero
        title="Vendre votre bien"
        titleClassName="text-4xl sm:text-5xl md:text-6xl"
        description="Le cabinet est à votre disposition dans le cadre de la mise en vente de votre bien avec des négociateurs expérimentés et un large carnet d’adresses et de recherches."
      />

      <section className="container mx-auto px-4 py-10">
        <p className="mt-8 max-w-3xl border-l-2 border-brand pl-5 font-display text-2xl leading-relaxed md:text-3xl">
          Le cabinet Foch Immobilier vous accompagne jusqu’au bout de votre projet, de l’avis de valeur à la signature.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="brand">
            <Link to="/estimation">Demander un avis de valeur</Link>
          </Button>
          <Button variant="brand" asChild>
            <Link to="/contact">Échanger avec un conseiller</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
