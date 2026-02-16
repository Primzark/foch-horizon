import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo/useSeo";

const points = [
  "Avis de valeur argumenté avec analyse locale.",
  "Mise en marché premium: photos, descriptif, diffusion ciblée.",
  "Qualification acheteurs et organisation des visites.",
  "Accompagnement administratif jusqu'à la signature.",
];

export default function SellPage() {
  useSeo({
    title: "Vendre | Foch Immobilier",
    description: "Un accompagnement structuré pour vendre votre bien dans la région du Havre.",
    canonicalPath: "/vendre",
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vendre</p>
        <h1 className="mt-2 font-display text-4xl">Vendre avec méthode, du mandat à l'acte</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Notre équipe construit une stratégie de mise en vente cohérente avec votre bien, votre calendrier et le marché local.
        </p>
      </header>

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

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/estimation">Demander une estimation</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/contact">Parler à un conseiller</Link>
        </Button>
      </div>
    </section>
  );
}
