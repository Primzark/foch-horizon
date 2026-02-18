import { Link } from "react-router-dom";
import { MapPin, Building2, Landmark, Anchor } from "lucide-react";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import {
  competitiveKeywordSignals,
  leHavreDistrictHistory,
  leHavreFaq,
  leHavreHistoryPhotos,
  leHavreHistoryTimeline,
  leHavreSeoKeywordBank,
} from "@/features/content/data/leHavreHistoryContent";

const photosById = new Map(leHavreHistoryPhotos.map((photo) => [photo.id, photo]));

export default function LeHavreHistoryPage() {
  const siteUrl = getSiteUrl();

  useSeo({
    title: "Histoire de l'immobilier au Havre | Quartiers, prix et dynamiques",
    description:
      "Analyse historique complete de l'immobilier au Havre: Perret, Saint-Francois, Saint-Vincent, Sanvic, Graville et Eure-Docks. Evolution du marche, investissement locatif et tendances locales.",
    canonicalPath: "/histoire-immobilier-le-havre",
    image: "/images/le-havre-history/panorama-le-havre.jpg",
    type: "article",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Histoire de l'immobilier au Havre",
            item: `${siteUrl}/histoire-immobilier-le-havre`,
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Histoire de l'immobilier au Havre: de la fondation a 2026",
        description:
          "Page historique dediee au marche immobilier du Havre, avec focus sur Perret, Saint-Francois, Saint-Vincent et les quartiers majeurs pour achat, vente, location et investissement locatif.",
        image: leHavreHistoryPhotos.map((photo) => `${siteUrl}${photo.src}`),
        inLanguage: "fr-FR",
        author: {
          "@type": "Organization",
          name: "Foch Immobilier",
        },
        publisher: {
          "@type": "RealEstateAgent",
          name: "Foch Immobilier",
          url: siteUrl,
          areaServed: "Le Havre",
        },
        about: leHavreDistrictHistory.map((district) => ({
          "@type": "Place",
          name: `${district.name}, Le Havre`,
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: leHavreFaq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Quartiers immobiliers majeurs du Havre",
        itemListElement: leHavreDistrictHistory.map((district, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: district.name,
        })),
      },
    ],
  });

  return (
    <article className="container mx-auto px-4 py-10 h-entry" itemScope itemType="https://schema.org/Article">
      <header className="max-w-5xl p-summary" itemProp="description">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Le Havre immobilier</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl p-name" itemProp="headline">
          Histoire de l'immobilier au Havre: des origines portuaires au marche 2026
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground e-content" itemProp="articleBody">
          Cette page rassemble les mots-cles les plus performants du marche immobilier Le Havre et les replace dans
          leur contexte historique: achat appartement Le Havre, maison a vendre Le Havre, location appartement Le Havre,
          estimation immobiliere Le Havre, gestion locative Le Havre et investissement locatif Le Havre. Objectif:
          proposer un contenu local, dense et utile pour comprendre chaque quartier avant un projet de vente, d'achat
          ou de mise en location.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6" aria-label="Navigation quartiers">
        <h2 className="font-display text-2xl">Quartiers cles de l'immobilier au Havre</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {leHavreDistrictHistory.map((district) => (
            <a
              key={district.id}
              href={`#${district.id}`}
              className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.15em] text-foreground/85 hover:bg-muted"
            >
              {district.name}
            </a>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {leHavreHistoryTimeline.map((entry) => (
          <article key={entry.period} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{entry.period}</p>
            <h2 className="mt-2 font-display text-2xl">{entry.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 space-y-7">
        {leHavreDistrictHistory.map((district) => {
          const districtPhotos = district.photoIds.map((photoId) => photosById.get(photoId)).filter(Boolean);

          return (
            <article
              id={district.id}
              key={district.id}
              className="scroll-mt-24 rounded-2xl border border-border bg-card p-6"
              itemScope
              itemType="https://schema.org/Neighborhood"
            >
              <header>
                <div className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Secteur
                </div>
                <h2 className="mt-3 font-display text-4xl" itemProp="name">
                  {district.name}
                </h2>
                <p className="mt-2 text-lg text-foreground/90">{district.headline}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground" itemProp="description">
                  {district.summary}
                </p>
              </header>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <article className="rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="inline-flex items-center gap-1 font-display text-2xl">
                    <Building2 className="h-5 w-5" /> Lecture marche
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{district.marketFocus}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{district.investmentAngle}</p>
                </article>

                <article className="rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="inline-flex items-center gap-1 font-display text-2xl">
                    <Landmark className="h-5 w-5" /> Repères historiques
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {district.timeline.map((step) => (
                      <li key={step} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>

              <div className="mt-5 flex flex-wrap gap-2" aria-label={`Mots-cles ${district.name}`}>
                {district.keywordTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-xs text-brand-strong">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {districtPhotos.map((photo) => (
                  <figure key={`${district.id}-${photo?.id}`} className="overflow-hidden rounded-xl border border-border">
                    <img
                      src={photo?.src}
                      alt={photo?.alt}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                      itemProp="image"
                    />
                    <figcaption className="space-y-2 p-3 text-xs text-muted-foreground">
                      <p>{photo?.caption}</p>
                      <p>
                        Source photo: <a href={photo?.sourceUrl} target="_blank" rel="noreferrer" className="underline">{photo?.author}</a> ({photo?.license})
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={`/biens?city=le-havre&q=${district.name.toLowerCase()}`} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">
                  Voir les biens {district.name}
                </Link>
                <Link to="/estimation" className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">
                  Estimer un bien dans ce secteur
                </Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="inline-flex items-center gap-2 font-display text-3xl">
          <Anchor className="h-6 w-6" /> Densite semantique immobilier Le Havre
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Ce contenu a ete structure autour des intentions de recherche les plus competitives du secteur local: agence
          immobiliere Le Havre, appartement a vendre Le Havre, maison a vendre Le Havre, location appartement Le Havre,
          estimation immobiliere Le Havre, prix immobilier Le Havre, investissement locatif Le Havre, gestion locative
          Le Havre, quartier Perret immobilier, quartier Saint-Francois Le Havre et quartier Saint-Vincent Le Havre.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {leHavreSeoKeywordBank.map((keyword) => (
            <span key={keyword} className="rounded-full border border-border px-3 py-1 text-xs">
              {keyword}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-3xl">Questions frequentes</h2>
          <div className="mt-4 space-y-4">
            {leHavreFaq.map((item) => (
              <article key={item.question} className="rounded-xl border border-border p-4">
                <h3 className="font-medium">{item.question}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-3xl">Signaux SEO concurrents (Le Havre)</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Grille de mots-cles inspirée des pages leaders sur le marche immobilier Le Havre.
          </p>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            {competitiveKeywordSignals.map((signal) => (
              <div key={signal.source} className="rounded-xl border border-border p-4">
                <p className="font-medium text-foreground">{signal.source}</p>
                <p className="mt-2">{signal.keywordPatterns.join(" · ")}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </article>
  );
}
