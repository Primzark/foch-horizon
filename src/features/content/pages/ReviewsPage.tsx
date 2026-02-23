import { useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock3, ExternalLink, MapPin, MessageSquareQuote, Navigation, ShieldCheck, Star } from "lucide-react";
import { GoogleGIcon } from "@/components/branding/GoogleGIcon";
import { getAgencyReviews } from "@/features/content/api/googleReviews.service";
import { heroScenicImages } from "@/features/content/data/heroScenicImages";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";

const AGENCY_ADDRESS_LABEL = "109 Av. Foch, 76600 Le Havre";
const AGENCY_MAP_EMBED_URL =
  "https://maps.google.com/maps?q=109%20Avenue%20Foch%2C%20Le%20Havre&t=&z=14&ie=UTF8&iwloc=&output=embed";
const AGENCY_GOOGLE_MAPS_URL = "https://www.google.com/maps/place/?q=place_id:ChIJVdXdwSMv4EcRDvxTc8oRcnI";
const REVIEW_COLLAPSE_CHAR_THRESHOLD = 250;

type ReviewCardVisualPreset = {
  accentImageUrl: string;
  accentLabel: string;
  accentHeightClass: string;
  accentPositionClass: string;
  wrapperOffsetClass: string;
  cardHeightHintClass: string;
  textureStyle: CSSProperties;
};

function formatDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`Note ${rating} sur 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index < rounded ? "fill-gold text-gold-dark" : "text-muted-foreground/40"}`}
        />
      ))}
    </div>
  );
}

function ReviewsStatusBadge({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        live
          ? "border border-brand-border bg-brand-soft text-brand-strong"
          : "border border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      {live ? "Google en direct" : "Instantané local"}
    </span>
  );
}

function ReviewsSourceBadge({ source }: { source: "google_places" | "edge" | "fallback" }) {
  const isFallback = source === "fallback";
  const label = isFallback ? "Source de secours" : "Google Reviews";

  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
      {isFallback ? <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> : <GoogleGIcon className="mr-1.5" size={13} decorative />}
      {label}
    </span>
  );
}

function getReviewCardAccentClass(index: number) {
  switch (index % 4) {
    case 0:
      return "to-brand-soft/25";
    case 1:
      return "to-gold-light/30";
    case 2:
      return "to-muted/30";
    default:
      return "to-brand-soft/20";
  }
}

function isExpandableReviewText(value: string): boolean {
  return value.trim().length > REVIEW_COLLAPSE_CHAR_THRESHOLD;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildTextureStyle(seed: number): CSSProperties {
  const hueA = 140 + (seed % 18);
  const hueB = 190 + (seed % 14);
  const angleA = 110 + (seed % 28);
  const angleB = 20 + (seed % 42);
  const stripeGap = 9 + (seed % 6);

  return {
    backgroundImage: [
      `linear-gradient(${angleA}deg, hsla(${hueA}, 44%, 61%, 0.18), transparent 52%)`,
      `radial-gradient(circle at 82% 14%, hsla(${hueB}, 55%, 72%, 0.14), transparent 54%)`,
      `repeating-linear-gradient(${angleB}deg, rgba(255,255,255,0.14) 0 1px, transparent 1px ${stripeGap}px)`,
    ].join(", "),
  };
}

function getReviewCardVisualPreset(reviewId: string, index: number): ReviewCardVisualPreset {
  const seed = hashString(`${reviewId}:${index}`);
  const scenic = heroScenicImages[seed % heroScenicImages.length];
  const accentHeightClass = ["h-20", "h-24", "h-28"][seed % 3] ?? "h-24";
  const accentPositionClass = ["bg-center", "bg-[center_32%]", "bg-[center_58%]"][seed % 3] ?? "bg-center";
  const wrapperOffsetClass =
    index === 0
      ? "md:mt-0"
      : (["md:mt-0 xl:mt-0", "md:mt-4 xl:mt-8", "md:mt-6 xl:mt-3", "md:mt-2 xl:mt-10"][seed % 4] ?? "md:mt-0");
  const cardHeightHintClass =
    index === 0
      ? "md:min-h-[22rem]"
      : (["md:min-h-[16rem]", "md:min-h-[18rem]", "md:min-h-[19rem]"][seed % 3] ?? "md:min-h-[17rem]");

  const accentLabel = scenic.title.replace(/,?\s*Le Havre$/i, "");

  return {
    accentImageUrl: scenic.imageUrl,
    accentLabel,
    accentHeightClass,
    accentPositionClass,
    wrapperOffsetClass,
    cardHeightHintClass,
    textureStyle: buildTextureStyle(seed),
  };
}

export default function ReviewsPage() {
  const siteUrl = getSiteUrl();
  const { reducedMotion } = useMotionPreference();
  const reviewsQuery = useQuery({ queryKey: ["agency-google-reviews"], queryFn: getAgencyReviews });
  const [expandedReviewIds, setExpandedReviewIds] = useState<Record<string, boolean>>({});

  const payload = reviewsQuery.data;

  const toggleReviewExpanded = (reviewId: string) => {
    setExpandedReviewIds((current) => ({
      ...current,
      [reviewId]: !current[reviewId],
    }));
  };

  useSeo({
    title: "Avis clients | Foch Immobilier Le Havre",
    description:
      "Consultez les avis clients vérifiés de Foch Immobilier au Havre: achat, vente, location et gestion locative.",
    canonicalPath: "/avis",
    jsonLd: payload
      ? [
          {
            "@context": "https://schema.org",
            "@type": "RealEstateAgent",
            name: "Foch Immobilier",
            url: siteUrl,
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: payload.rating,
              reviewCount: payload.userRatingCount,
              bestRating: 5,
              worstRating: 1,
            },
            review: payload.reviews.slice(0, 5).map((review) => ({
              "@type": "Review",
              author: {
                "@type": "Person",
                name: review.authorName,
              },
              reviewRating: {
                "@type": "Rating",
                ratingValue: review.rating,
                bestRating: 5,
                worstRating: 1,
              },
              reviewBody: review.text,
              datePublished: review.publishTime,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl}/` },
              { "@type": "ListItem", position: 2, name: "Avis", item: `${siteUrl}/avis` },
            ],
          },
        ]
      : undefined,
  });

  return (
    <section className="container mx-auto px-4 py-10 h-feed">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Réputation</p>
        <div className="mt-2 inline-flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/85 shadow-sm">
            <GoogleGIcon size={18} decorative />
          </span>
          <h1 className="font-display text-4xl">Avis clients Foch Immobilier</h1>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Notes et retours vérifiés sur nos services immobiliers au Havre: vente, achat, location et gestion locative.
        </p>
      </header>

      {reviewsQuery.isLoading && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
      )}

      {reviewsQuery.isError && (
        <div className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
          Les avis Google sont momentanément indisponibles. Merci de réessayer dans quelques instants.
        </div>
      )}

      {payload && (
        <>
          <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,hsl(var(--gold-light)/0.35),transparent_42%),radial-gradient(circle_at_92%_0%,hsl(var(--brand-soft)/0.5),transparent_45%)]" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Source</p>
                    <div className="mt-1 inline-flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/85">
                        <GoogleGIcon size={14} decorative />
                      </span>
                      <p className="font-display text-3xl leading-tight">{payload.placeName}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <ReviewsStatusBadge live={payload.live} />
                      <ReviewsSourceBadge source={payload.source} />
                    </div>
                  </div>

                  <div className="min-w-[170px] rounded-2xl border border-border bg-background/80 p-4 text-right shadow-[0_12px_24px_-18px_hsl(var(--foreground)/0.18)] backdrop-blur-sm">
                    <p className="font-display text-5xl leading-none">{payload.rating.toFixed(1)}</p>
                    <div className="mt-2">
                      <StarRating rating={payload.rating} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{payload.userRatingCount} avis Google</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Avis visibles</p>
                    <p className="mt-2 text-2xl font-semibold">{payload.reviews.length}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Extraits affichés sur cette page</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ancrage local</p>
                    <p className="mt-2 text-base font-semibold">Le Havre · Foch</p>
                    <p className="mt-1 text-xs text-muted-foreground">Agence physique vérifiable sur Google Maps</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Actualisation</p>
                    <p className="mt-2 text-base font-semibold">{formatDate(payload.fetchedAt) ?? "Indisponible"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Dernière collecte: {formatDateTime(payload.fetchedAt) ?? "N/A"}</p>
                  </div>
                </div>

                {!payload.live && (
                  <p className="mt-5 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Vous consultez un instantané local de secours. Les avis Google en direct ne sont pas disponibles pour cette session.
                  </p>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <div className="flex items-center justify-between gap-3 border-b border-border/80 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Preuve locale</p>
                  <h2 className="mt-1 text-lg font-medium">Adresse d'agence et présence de quartier</h2>
                </div>
                <MapPin className="h-5 w-5 text-brand" />
              </div>

              <div className="px-5 pt-4">
                <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-background/70 p-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-brand-soft text-brand-strong">
                    <Navigation className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Foch Immobilier · Le Havre</p>
                    <p className="mt-1 text-sm text-muted-foreground">{AGENCY_ADDRESS_LABEL}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={AGENCY_GOOGLE_MAPS_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-medium text-white shadow-[0_12px_24px_-16px_hsl(var(--brand)/0.35)] transition-colors hover:bg-brand/90"
                      >
                        <GoogleGIcon size={13} decorative />
                        Voir sur Google Maps
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href="/contact"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium transition-colors hover:border-brand-border hover:bg-brand-soft/50"
                      >
                        Contacter l'agence
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden border-y border-border/70">
                <iframe
                  title="Carte Foch Immobilier Le Havre"
                  src={AGENCY_MAP_EMBED_URL}
                  className="h-72 w-full"
                  loading="lazy"
                />
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Signal de confiance</p>
                  <p className="mt-2 text-sm leading-relaxed">
                    Les avis affichés proviennent de la fiche Google liée à l'adresse de l'agence.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lecture de marché</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Un retour client local complète les annonces et l'expertise quartier par quartier sur Le Havre.
                  </p>
                </div>
              </div>
            </section>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Retours clients</p>
                <div className="mt-1 inline-flex items-center gap-2">
                  <GoogleGIcon size={18} decorative />
                  <h2 className="font-display text-3xl">Luxury Card Grid</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Extraits Google récents ou représentatifs liés à l'activité locale de l'agence.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Dernière collecte: {formatDateTime(payload.fetchedAt) ?? "indisponible"}
              </div>
            </div>

            <section className="columns-1 [column-gap:1rem] md:columns-2 xl:columns-3">
              {payload.reviews.map((review, index) => {
                const visual = getReviewCardVisualPreset(review.id, index);
                const isExpandable = isExpandableReviewText(review.text);
                const isExpanded = Boolean(expandedReviewIds[review.id]);

                return (
                  <motion.div
                    key={review.id}
                    className={cn("mb-4 break-inside-avoid", visual.wrapperOffsetClass)}
                    initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.988 }}
                    whileInView={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.18 }}
                    transition={
                      reducedMotion
                        ? undefined
                        : {
                            duration: 0.38,
                            ease: [0.22, 1, 0.36, 1],
                            delay: Math.min(index * 0.06, 0.28),
                          }
                    }
                  >
                    <article
                      className={cn(
                        "group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-card-hover h-review",
                        getReviewCardAccentClass(index),
                        visual.cardHeightHintClass,
                      )}
                    >
                      <div className="pointer-events-none absolute inset-0 opacity-60" style={visual.textureStyle} />
                      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gold-light/35 blur-2xl" />
                      <div className="pointer-events-none absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-background/85 text-gold-dark backdrop-blur-sm">
                        <MessageSquareQuote className="h-4 w-4" />
                      </div>

                      <div className="relative flex h-full flex-col">
                        <div className="mb-4 overflow-hidden rounded-2xl border border-border/80 bg-background/70 shadow-[0_10px_20px_-18px_hsl(var(--foreground)/0.3)]">
                          <div className={cn("relative overflow-hidden", visual.accentHeightClass)}>
                            <div
                              className={cn(
                                "absolute inset-0 bg-cover bg-no-repeat transition-transform duration-500 group-hover:scale-[1.04]",
                                visual.accentPositionClass,
                              )}
                              style={{ backgroundImage: `url(${visual.accentImageUrl})` }}
                              aria-hidden="true"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--foreground)/0.55)] via-[hsl(var(--foreground)/0.1)] to-transparent" />
                            <div className="absolute inset-0 opacity-50" style={visual.textureStyle} />
                            <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[10px] font-medium tracking-[0.12em] text-white backdrop-blur-sm">
                              <MapPin className="h-3 w-3" />
                              {visual.accentLabel}
                            </div>
                          </div>
                        </div>

                        <div className="pr-10">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium leading-snug p-author h-card">{review.authorName}</p>
                              <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <GoogleGIcon size={12} decorative />
                                <span>{review.relativePublishTimeDescription ?? formatDate(review.publishTime) ?? "Avis Google"}</span>
                              </div>
                            </div>
                            <div className="rounded-full border border-border bg-background/85 px-2 py-1 backdrop-blur-sm">
                              <StarRating rating={review.rating} />
                            </div>
                          </div>
                        </div>

                        <div className="relative mt-4">
                          <p
                            className={cn(
                              "text-sm leading-relaxed text-muted-foreground p-name whitespace-pre-line",
                              !isExpanded && isExpandable && "max-h-[8.25rem] overflow-hidden",
                            )}
                          >
                            {review.text}
                          </p>
                          {!isExpanded && isExpandable && (
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card via-card/95 to-transparent" />
                          )}
                        </div>

                        {isExpandable && (
                          <button
                            type="button"
                            onClick={() => toggleReviewExpanded(review.id)}
                            className="mt-3 inline-flex w-fit items-center gap-1 rounded-full border border-border bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-brand-border hover:bg-brand-soft/40"
                          >
                            {isExpanded ? "Réduire" : "Lire la suite"}
                          </button>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-soft/70 px-2.5 py-1 text-[11px] font-medium text-brand-strong">
                            <GoogleGIcon size={11} decorative />
                            Google
                          </span>
                          {review.authorUrl && (
                            <a
                              href={review.authorUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            >
                              Profil Google
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  </motion.div>
                );
              })}
            </section>
          </section>
        </>
      )}
    </section>
  );
}
