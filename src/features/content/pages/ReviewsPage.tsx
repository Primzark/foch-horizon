import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MessageSquareQuote, Star } from "lucide-react";
import { getAgencyReviews } from "@/features/content/api/googleReviews.service";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";

function formatDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
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

export default function ReviewsPage() {
  const siteUrl = getSiteUrl();
  const reviewsQuery = useQuery({ queryKey: ["agency-google-reviews"], queryFn: getAgencyReviews });

  const payload = reviewsQuery.data;

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
        <h1 className="mt-2 font-display text-4xl">Avis clients Foch Immobilier</h1>
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
          <section className="mt-8 rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Source</p>
                <p className="mt-1 text-lg font-medium">{payload.placeName}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-4xl">{payload.rating.toFixed(1)}</p>
                <StarRating rating={payload.rating} />
                <p className="mt-1 text-sm text-muted-foreground">{payload.userRatingCount} avis Google</p>
              </div>
            </div>

            {!payload.live && (
              <p className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Les avis affichés sont issus de notre dernière mise à jour disponible.
              </p>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Dernière mise à jour: {formatDate(payload.fetchedAt) ?? "indisponible"}
            </p>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {payload.reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-border bg-card p-5 h-review">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium p-author h-card">{review.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {review.relativePublishTimeDescription ?? formatDate(review.publishTime) ?? "Avis Google"}
                    </p>
                  </div>
                  <StarRating rating={review.rating} />
                </div>

                <p className="mt-3 text-sm leading-relaxed text-muted-foreground p-name">
                  <MessageSquareQuote className="mr-1 inline h-3.5 w-3.5" />
                  {review.text}
                </p>

                {review.authorUrl && (
                  <a
                    href={review.authorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Profil Google
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </section>
  );
}
