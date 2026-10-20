import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo/useSeo";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";

const points = [
  "Avis de valeur argumenté avec analyse locale approfondie.",
  "Mise en marché premium: visuels, narration et diffusion ciblée.",
  "Qualification acquéreurs et pilotage des visites.",
  "Accompagnement juridique et administratif jusqu'à la signature.",
];

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
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {points.map((point) => (
            <p key={point} className="text-sm leading-relaxed">{point}</p>
          ))}
        </div>
      </div>

      <p className="mt-8 max-w-3xl border-l-2 border-brand pl-5 font-display text-xl leading-relaxed">
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
