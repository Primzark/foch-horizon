import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo/useSeo";
import { AgencyPageHeader } from "@/features/content/components/AgencyPageHeader";

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
    <section className="container mx-auto px-4 py-10">
      <AgencyPageHeader
        eyebrow="Vendre"
        title="Vendre avec méthode, du mandat à l'acte"
        description="Nous construisons une stratégie de vente cohérente avec votre bien, votre calendrier et les standards du marché local."
      />

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <ul className="grid gap-3 md:grid-cols-2">
          {points.map((point) => (
            <li key={point} className="inline-flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              {point}
            </li>
          ))}
        </ul>
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
  );
}
