import { Link } from "react-router-dom";
import { atLocation } from "@/lib/utils/frenchLocation";
import { isHavreNeighborhood } from "@/lib/seo/entities";
import { MoveUpRight } from "lucide-react";
import { geographyGuides, type GeographyGuide } from "@/features/content/data/geographyGuides";
import { useSiteLanguage } from "@/lib/i18n/LanguageProvider";
import { translateText } from "@/lib/i18n/catalog";

const guideFacts = [
  { key: "historyArchitecture", title: "Histoire et architecture" },
  { key: "schoolsServices", title: "Écoles et services" },
  { key: "shopsLeisure", title: "Commerces, loisirs et espaces verts" },
  { key: "projectsTransport", title: "Projets et accessibilité" },
] as const;

function formatReviewedAt(date: string, language: "fr" | "en"): string {
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

type GeographyGuideDetailsProps = {
  guide: GeographyGuide;
  className?: string;
  headingLevel?: 3 | 4 | 5;
};

export function GeographyGuideDetails({ guide, className = "", headingLevel = 3 }: GeographyGuideDetailsProps) {
  const { language } = useSiteLanguage();
  const Heading = `h${headingLevel}` as "h3" | "h4" | "h5";
  const searchParams = new URLSearchParams({ ...(guide.listingSearch.city ? { city: guide.listingSearch.city } : {}), ...(guide.listingSearch.query ? { q: guide.listingSearch.query } : {}) });

  return (
    <div className={className}>
      {guide.reviewedAt && <p className="mb-4 text-xs text-muted-foreground">Repères locaux vérifiés le <time dateTime={guide.reviewedAt}>{formatReviewedAt(guide.reviewedAt, language)}</time> · Sources officielles citées ci-dessous.</p>}
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        {guideFacts.map((fact) => (
          <section key={fact.key}>
            <Heading className="text-sm font-semibold">{fact.title}</Heading>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground"><ContextualText text={guide[fact.key]} /></p>
            {fact.key === "schoolsServices" && <p className="mt-2 text-xs text-muted-foreground">Retrouvez les coordonnées des établissements dans l’<a className="text-brand-strong underline underline-offset-4" href="https://www.education.gouv.fr/annuaire" target="_blank" rel="noopener noreferrer">annuaire officiel de l’Éducation nationale</a> ; confirmez la sectorisation auprès de la mairie.</p>}
          </section>
        ))}
        <section className="md:col-span-2">
          <Heading className="text-sm font-semibold">Types de biens courants</Heading>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground"><ContextualText text={guide.typicalHomes} /></p>
        </section>
      </div>

      <section className="mt-6 border-t border-border pt-5" aria-label={`Projet immobilier : ${guide.name}`}>
        <Heading className="text-sm font-semibold">{language === "en" ? `Plan your move in ${guide.name}` : `Préparer votre projet ${atLocation(guide.name)}`}</Heading>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Foch Immobilier vous accompagne depuis son agence du Havre, au 109 avenue Foch.
          {isHavreNeighborhood(guide) && <> Ce secteur appartient au <Link className="underline underline-offset-4" to="/immobilier/le-havre">Havre</Link>, en Seine-Maritime, en Normandie.</>}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-brand-strong">
          <li><Link className="underline underline-offset-4" to={`/biens?${searchParams}&transaction=vente`}>{language === "en" ? `Properties for sale in ${guide.name}` : `Biens à acheter ${atLocation(guide.name)}`}</Link></li>
          <li><Link className="underline underline-offset-4" to={`/biens?${searchParams}&type=appartement`}>{language === "en" ? `Apartments in ${guide.name}` : `Appartements ${atLocation(guide.name)}`}</Link></li>
          <li><Link className="underline underline-offset-4" to={`/biens?${searchParams}&type=maison_villa`}>{language === "en" ? `Houses in ${guide.name}` : `Maisons ${atLocation(guide.name)}`}</Link></li>
          <li><Link className="underline underline-offset-4" to={`/estimation?ville=${encodeURIComponent(guide.listingSearch.city ?? guide.name)}`}>{language === "en" ? "Value your property" : `Estimer votre bien ${atLocation(guide.name)}`}</Link></li>
          <li><Link className="underline underline-offset-4" to="/vendre">Accompagnement pour vendre</Link></li>
          <li><Link className="underline underline-offset-4" to="/reglementation-immobiliere">Diagnostics et réglementation immobilière</Link></li>
          <li><Link className="underline underline-offset-4" to="/geographie">Patrimoine et quartiers du Havre</Link></li>
        </ul>
        {(guide.nearbyGuideIds?.length ?? 0) > 0 && <p className="mt-3 text-sm text-muted-foreground">Secteurs à comparer : {guide.nearbyGuideIds!.map((id, index) => {
          const nearby = geographyGuides.find((item) => item.id === id);
          return nearby ? <span key={id}>{index > 0 && " · "}<Link className="underline underline-offset-4" to={`/immobilier/${id}`}>{nearby.name}</Link></span> : null;
        })}</p>}
      </section>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
        <a className="inline-flex items-center gap-1 text-brand-strong underline underline-offset-4" href={guide.link.href} target="_blank" rel="noreferrer">
          {guide.link.label}<MoveUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

export function ContextualText({ text }: { text: string }) {
  const { language } = useSiteLanguage();
  const localizedText = translateText(text, language);
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(localizedText)) !== null) {
    if (match.index > lastIndex) nodes.push(localizedText.slice(lastIndex, match.index));
    nodes.push(
      <a key={`${match.index}-${match[1]}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-strong underline decoration-brand/50 underline-offset-4 hover:decoration-brand">
        {match[1]}
      </a>,
    );
    lastIndex = linkPattern.lastIndex;
  }

  if (nodes.length === 0) return localizedText;
  if (lastIndex < localizedText.length) nodes.push(localizedText.slice(lastIndex));
  return <>{nodes}</>;
}
