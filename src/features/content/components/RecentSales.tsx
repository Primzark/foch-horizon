import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BedDouble, MapPin, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { geographyPhotoCredits } from "@/features/content/data/geographyGuides";
import { PhotoAttribution } from "@/features/content/components/PhotoAttribution";
import { getRecentSales } from "@/features/content/api/recentSales.service";
import { SearchThinkingState } from "@/features/content/components/SearchThinkingState";
import { searchProperties } from "@/features/listings/api/properties.service";
import { formatPrice, formatPropertyTypeLabel, getPropertyCardLabels, isAvailablePropertyStatus } from "@/features/listings/utils/formatting";
import { PropertyPreviewLink } from "@/features/listings/components/PropertyPreviewLink";
import { ListingBadges } from "@/features/listings/components/ListingBadges";
import type { PropertySearchItem } from "@/types/api";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";

export function RecentSales({ compact = false }: { compact?: boolean }) {
  const query = useQuery({ queryKey: ["recent-sales", "sold"], queryFn: getRecentSales, staleTime: 300_000 });
  const sales = compact ? query.data?.slice(0, 3) : query.data;
  const availablePropertiesQuery = useQuery({
    queryKey: ["recent-sales", "available-properties"],
    queryFn: async () => {
      const result = await searchProperties({ transaction: "vente", sort: "newest", page: 1, pageSize: 100 });
      return result.items.filter((item) => isAvailablePropertyStatus(item.status) && item.coverImageUrl).slice(0, 8);
    },
    enabled: !compact && query.isSuccess && (query.data?.length ?? 0) === 0,
    staleTime: 300_000,
  });

  const featuredProperties = availablePropertiesQuery.data ?? [];
  const displayedProperties = !compact && (sales?.length ?? 0) === 0 ? featuredProperties : sales ?? [];
  const showsSales = (sales?.length ?? 0) > 0;

  return (
    <section className={compact ? "border-b border-border bg-card" : ""}>
      <div className={compact ? "container mx-auto px-4 py-10 md:py-12" : "pt-4 pb-10"}>
        <div>
          {(compact || (query.isSuccess && !showsSales)) && (
            <div className={compact ? "grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,0.72fr)] sm:items-end" : undefined}>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-brand-strong">
                  {!compact && query.data?.length === 0
                    ? "Aucune vente enregistrée n’est publiée pour le moment"
                    : "Des projets accompagnés"}
                </p>
                <h2 className="mt-2 max-w-3xl font-display text-3xl leading-tight sm:text-4xl md:text-5xl">
                  {showsSales ? "Nos dernières ventes" : "Biens actuellement à vendre"}
                </h2>
              </div>
              {compact && (
                <Link to="/nos-dernieres-ventes" className="inline-flex items-center gap-2 text-sm hover:underline sm:justify-self-end">
                  Nos dernières ventes <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
          {query.isLoading && (
            <SearchThinkingState
              label="Chargement des dernières ventes"
              className="mt-6 w-fit max-w-full"
            />
          )}
          {query.isError && (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <p className="text-sm text-muted-foreground">Nos dernières ventes ne sont pas disponibles pour le moment.</p>
              <Button variant="outline" onClick={() => query.refetch()}>Réessayer</Button>
            </div>
          )}
          {!compact && query.data?.length === 0 && availablePropertiesQuery.isLoading && (
            <SearchThinkingState
              label="Chargement de notre sélection"
              className="mt-6 w-fit max-w-full"
            />
          )}
          {!compact && !query.isLoading && !query.isError && displayedProperties.length > 0 && (
            <ul
              className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              aria-label={showsSales ? "Nos dernières ventes" : "Biens à la vente au Havre et alentours"}
            >
              {displayedProperties.map((property) => (
                <li key={property.id}>
                  <PropertySaleCard property={property} browseItems={displayedProperties} isSold={showsSales} />
                </li>
              ))}
            </ul>
          )}
          {!query.isLoading && !query.isError && !compact && query.data?.length === 0 && !availablePropertiesQuery.isLoading && displayedProperties.length === 0 && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-6 md:p-8">
              <h3 className="font-display text-2xl">Une recherche en tête ?</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Notre sélection évolue régulièrement. Contactez l’équipe Foch Immobilier pour parler des biens à découvrir au Havre et sur le littoral.
              </p>
              <Link to="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand-strong hover:underline">
                Échanger avec le cabinet <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          )}
          {compact && !query.isLoading && !query.isError && sales?.length === 0 && (
            <div className="mt-6 grid overflow-hidden rounded-2xl border border-border bg-background md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <figure className="relative isolate min-h-64 overflow-hidden bg-slate-900 md:min-h-72">
                <img
                  src="/images/geography/panorama-le-havre.webp"
                  alt="Panorama du Havre, entre front de mer et quartiers résidentiels"
                  className="absolute inset-0 -z-10 h-full w-full object-cover object-[52%_48%]"
                  loading="lazy"
                />
                <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/65 via-slate-950/5 to-transparent" />
                <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/30 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5" /> Le Havre et le littoral
                </div>
                <PhotoAttribution credit={geographyPhotoCredits.panorama} />
                <div className="absolute bottom-5 right-5 hidden w-36 overflow-hidden rounded-xl border-4 border-white shadow-xl sm:block md:w-40">
                  <div className="relative">
                    <img
                      src="/images/geography/architecture-perret.webp"
                      alt="Architecture Perret au Havre"
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                    <PhotoAttribution credit={geographyPhotoCredits.perret} />
                  </div>
                  <p className="bg-white px-2 py-1.5 text-xs font-medium text-slate-800">Le centre reconstruit</p>
                </div>
              </figure>
              <div className="flex flex-col justify-center p-6 md:p-8 lg:p-10">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-strong">À vos côtés depuis 1972</p>
                <h3 className="mt-3 font-display text-2xl md:text-3xl">Des ventes à découvrir avec notre équipe</h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Découvrez nos références de vente auprès de notre équipe et parlons de votre projet.</p>
                <Link to="/contact" className="mt-6 inline-flex items-center gap-2 self-start text-sm font-medium text-brand-strong hover:underline">Échanger avec le cabinet <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          )}
          {compact && sales && sales.length > 0 && (
            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sales.map((sale) => (
                <article key={sale.id}>
                  <PropertyPreviewLink
                    item={sale}
                    browseItems={sales}
                    aria-label={`Voir le bien vendu : ${sale.title}`}
                    className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
                  >
                    <div className="relative overflow-hidden rounded-xl bg-muted">
                      <img
                        src={getPropertyImageUrl(sale.coverImageUrl, 400)}
                        srcSet={getPropertyImageSrcSet(sale.coverImageUrl)}
                        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                        alt={sale.title}
                        className="aspect-[4/3] w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <ListingBadges labels={getPropertyCardLabels(sale)} className="absolute left-3 top-3 z-[2]" />
                    </div>
                    <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{sale.city.name} · {sale.surfaceM2} m²</p>
                    <div className="mt-1 flex items-start justify-between gap-3">
                      <h3 className="font-display text-2xl transition-colors group-hover:text-brand-strong">{sale.title}</h3>
                      <ArrowRight aria-hidden="true" className="mt-2 h-4 w-4 shrink-0 text-brand-strong transition-transform group-hover:translate-x-1" />
                    </div>
                  </PropertyPreviewLink>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PropertySaleCard({ property, browseItems, isSold }: { property: PropertySearchItem; browseItems: PropertySearchItem[]; isSold: boolean }) {
  const labels = getPropertyCardLabels(property);
  const content = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={getPropertyImageUrl(property.coverImageUrl, 400)}
          srcSet={getPropertyImageSrcSet(property.coverImageUrl)}
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
          alt={property.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent opacity-80" />
        {isSold ? (
          <ListingBadges labels={labels} className="absolute left-4 top-4 z-[2]" />
        ) : (
          <>
            <span className="absolute left-4 top-4 rounded-full border border-white/70 bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
              À la vente
            </span>
            <ListingBadges labels={labels} className="absolute left-4 right-4 top-14 z-[2]" />
          </>
        )}
        <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 text-sm font-medium text-white drop-shadow">
          <MapPin aria-hidden="true" className="h-4 w-4" /> {property.city.name}
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{formatPropertyTypeLabel(property.type)}</p>
        <h3 className="mt-2 line-clamp-2 min-h-[3.5rem] font-display text-xl leading-snug transition-colors group-hover:text-brand-strong">{property.title}</h3>
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Maximize aria-hidden="true" className="h-4 w-4" /> {property.surfaceM2} m²</span>
          {property.bedrooms != null && <span className="inline-flex items-center gap-1.5"><BedDouble aria-hidden="true" className="h-4 w-4" /> {property.bedrooms}</span>}
          {property.dpeLabel && <span className="ml-auto rounded-md border border-border px-2 py-0.5 text-xs font-semibold">DPE {property.dpeLabel}</span>}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="font-display text-2xl">{isSold ? "Vendu par l’agence" : formatPrice(property.priceAmount, property.transaction)}</span>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-strong">
            Voir le bien <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </>
  );

  return (
    <article className="h-full">
      <PropertyPreviewLink
        item={property}
        browseItems={browseItems}
        aria-label={`Voir le bien${isSold ? " vendu" : ""} : ${property.title}`}
        className="group block h-full overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {content}
      </PropertyPreviewLink>
    </article>
  );
}
