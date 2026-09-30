import { MoveUpRight } from "lucide-react";
import type { GeographyGuide } from "@/features/content/data/geographyGuides";

const guideFacts = [
  { key: "historyArchitecture", title: "Histoire et architecture" },
  { key: "schoolsServices", title: "Écoles et services" },
  { key: "shopsLeisure", title: "Commerces, loisirs et espaces verts" },
  { key: "projectsTransport", title: "Projets et accessibilité" },
] as const;

const guidePrices = [
  { key: "apartment", title: "Appartements" },
  { key: "house", title: "Maisons" },
  { key: "studio", title: "Studios" },
  { key: "luxury", title: "Haut de gamme" },
  { key: "newBuild", title: "Neuf" },
  { key: "older", title: "Ancien" },
] as const;

type GeographyGuideDetailsProps = {
  guide: GeographyGuide;
  className?: string;
};

export function GeographyGuideDetails({ guide, className = "" }: GeographyGuideDetailsProps) {
  return (
    <div className={className}>
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        {guideFacts.map((fact) => (
          <section key={fact.key}>
            <h3 className="text-sm font-semibold">{fact.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{guide[fact.key]}</p>
          </section>
        ))}
        <section className="md:col-span-2">
          <h3 className="text-sm font-semibold">Types de biens courants</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{guide.typicalHomes}</p>
        </section>
      </div>

      <section className="mt-6 border-t border-border pt-5" aria-labelledby={`guide-prices-${guide.id}`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 id={`guide-prices-${guide.id}`} className="font-display text-xl">Prix estimés au m² par type de bien</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{guide.marketBasis}</p>
          </div>
          <span className="text-sm font-semibold text-brand-strong">Moyenne indicative : {guide.averagePrice}</span>
        </div>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {guidePrices.map((price) => (
            <div key={price.key} className="rounded-xl border border-border bg-background p-3">
              <dt className="text-xs font-semibold text-foreground">{price.title}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{guide[price.key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
        <a className="inline-flex items-center gap-1 text-brand-strong underline underline-offset-4" href={guide.link.href} target="_blank" rel="noreferrer">
          {guide.link.label}<MoveUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
        <a className="inline-flex items-center gap-1 text-brand-strong underline underline-offset-4" href={guide.priceLink.href} target="_blank" rel="noreferrer">
          {guide.priceLink.label}<MoveUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
