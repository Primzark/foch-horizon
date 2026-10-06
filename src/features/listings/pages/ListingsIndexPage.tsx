import { atLocation } from "@/lib/utils/frenchLocation";
import { StorefrontPageHero } from "@/features/content/components/StorefrontPageHero";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { searchProperties } from "@/features/listings/api/properties.service";
import { ActiveFiltersChips } from "@/features/listings/components/ActiveFiltersChips";
import { FiltersBar } from "@/features/listings/components/FiltersBar";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { PropertyMapSplitView } from "@/features/listings/components/PropertyMapSplitView";
import { PaginationBar } from "@/features/listings/components/PaginationBar";
import { buildSearchParams, parseSearchParams } from "@/features/listings/utils/query";
import type { PropertySearchParams } from "@/types/api";
import { useFavoritesStore } from "@/features/favorites/useFavoritesStore";
import { cityBySlug } from "@/features/cities/data/cities";
import { geographyGuides } from "@/features/content/data/geographyGuides";
import { GeographyGuideDetails } from "@/features/content/components/GeographyGuideDetails";
import { useUiStore } from "@/lib/state/useUiStore";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { formatPrice, formatPropertyTypeLabel, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { SearchThinkingState } from "@/features/content/components/SearchThinkingState";

const defaultParams: PropertySearchParams = {
  transaction: "vente",
  page: 1,
  pageSize: 12,
  sort: "newest",
};

export default function ListingsIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">("grid");
  const { reducedMotion } = useMotionPreference();
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);
  const favoriteIds = useFavoritesStore((state) => state.ids);
  const siteUrl = getSiteUrl();

  const filters = useMemo(() => {
    const parsed = parseSearchParams(searchParams);
    const definedParsed = Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value !== undefined),
    ) as PropertySearchParams;
    return { ...defaultParams, ...definedParsed };
  }, [searchParams]);
  const locationGuideId = searchParams.get("guide");
  const locationGuide = geographyGuides.find((guide) => guide.id === locationGuideId);

  const buildContextualSearchParams = (nextFilters: PropertySearchParams) => {
    const nextParams = buildSearchParams(nextFilters);
    if (locationGuide) nextParams.set("guide", locationGuide.id);
    return nextParams;
  };

  const query = useQuery({
    queryKey: ["properties", filters],
    queryFn: () => searchProperties(filters),
  });

  const isPriceSort = filters.sort === "price_asc" || filters.sort === "price_desc";
  const sortDirection = filters.sort === "price_asc" ? 1 : filters.sort === "price_desc" ? -1 : 0;

  const resultsMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : isPriceSort
      ? {
          initial: { opacity: 0, y: sortDirection > 0 ? 16 : 10, scale: 0.992, filter: "blur(8px)" },
          animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
          exit: { opacity: 0, y: -8, scale: 0.994, filter: "blur(6px)" },
        }
      : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

  const resultsKey = query.data
    ? `${viewMode}-${filters.sort ?? "newest"}-${query.data.page}-${query.data.total}-${query.data.items.map((item) => item.id).join("-")}`
    : `${viewMode}-loading`;

  const updateFilters = (updates: Partial<PropertySearchParams>) => {
    const next = { ...filters, ...updates };
    if (!updates.page) {
      next.page = 1;
    }
    setSearchParams(buildContextualSearchParams(next));
  };

  const clearFilter = (key: keyof PropertySearchParams) => {
    const next: PropertySearchParams = { ...filters, [key]: undefined };
    next.page = 1;
    setSearchParams(buildContextualSearchParams(next));
  };

  const clearAreaFilter = () => {
    const next: PropertySearchParams = { ...filters, city: undefined, q: undefined, page: 1 };
    setSearchParams(buildContextualSearchParams(next));
  };

  const clearAllCriteria = () => {
    setSearchParams(
      buildContextualSearchParams({
        transaction: filters.transaction,
        page: 1,
        pageSize: 12,
        sort: "newest",
      }),
    );
  };

  const recoveryActions: Array<{ label: string; filters: Partial<PropertySearchParams> }> = [];
  if (filters.q) {
    const cityName = filters.city ? cityBySlug.get(filters.city)?.name : undefined;
    recoveryActions.push({
      label: cityName ? `Voir tous les biens ${atLocation(cityName)}` : `Retirer « ${filters.q} »`,
      filters: { q: undefined },
    });
  }
  if (filters.priceMax != null && filters.priceMax > 0) {
    const widerBudget = Math.ceil((filters.priceMax * 1.1) / 5_000) * 5_000;
    if (widerBudget > filters.priceMax) {
      recoveryActions.push({
        label: `Élargir le budget à ${formatPrice(widerBudget, filters.transaction ?? "vente")}`,
        filters: { priceMax: widerBudget },
      });
    }
  }
  if (filters.features?.length) {
    recoveryActions.push({ label: "Retirer les critères d’équipement", filters: { features: undefined } });
  }
  if (filters.bedroomsMin != null && filters.bedroomsMin > 0) {
    const bedroomsMin = filters.bedroomsMin - 1;
    recoveryActions.push({
      label: bedroomsMin === 0 ? "Ne pas imposer de nombre de chambres" : `Dès ${bedroomsMin} chambres`,
      filters: { bedroomsMin },
    });
  }
  if (filters.surfaceMin != null && filters.surfaceMin > 0) {
    const surfaceMin = Math.max(0, filters.surfaceMin - 10);
    recoveryActions.push({
      label: surfaceMin === 0 ? "Retirer la surface minimale" : `Inclure les biens dès ${surfaceMin} m²`,
      filters: { surfaceMin },
    });
  }
  if (filters.priceMin != null && filters.priceMin > 0) {
    recoveryActions.push({ label: "Inclure les biens moins chers", filters: { priceMin: undefined } });
  }
  if (filters.type) {
    recoveryActions.push({
      label: `Voir tous les types (actuellement ${formatPropertyTypeLabel(filters.type).toLowerCase()})`,
      filters: { type: undefined },
    });
  }
  if (filters.city) {
    recoveryActions.push({ label: "Élargir à toutes les villes", filters: { city: undefined } });
  }

  useSeo({
    title: "Biens immobiliers | Foch Immobilier",
    description: "Découvrez nos biens à vendre au Havre et sur le littoral.",
    canonicalPath: "/biens",
    noIndex: searchParams.toString().length > 0,
    jsonLd: query.data
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Annonces immobilieres Le Havre",
          numberOfItems: query.data.total,
          itemListElement: query.data.items.slice(0, 24).map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${siteUrl}${toCanonicalPropertyPath({ id: item.id, slug: item.slug })}`,
            name: item.title,
          })),
        }
      : undefined,
  });

  return (
    <>
      <StorefrontPageHero
        eyebrow="À découvrir"
        title="Nos biens"
        description="Affinez votre recherche et trouvez le bien qui correspond à votre projet."
      />

      <section className="container mx-auto px-4 py-6">
      <FiltersBar
        sort={filters.sort ?? "newest"}
        onSortChange={(value) => updateFilters({ sort: value as PropertySearchParams["sort"] })}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenDrawer={() => setSearchDrawerOpen(true)}
        total={query.data?.total ?? 0}
      />

      <ActiveFiltersChips
        filters={filters}
        onClear={clearFilter}
        onClearArea={clearAreaFilter}
        onClearAll={() => setSearchParams(buildContextualSearchParams(defaultParams))}
      />

      {favoriteIds.length >= 3 && (
        <div className="mb-4 rounded-2xl border border-brand-border bg-brand-soft/60 p-4 text-sm text-brand-strong">
          <p>
            Vous avez sauvegardé {favoriteIds.length} biens. Besoin d'un regard expert ?{" "}
            <a href="/contact" className="font-semibold underline underline-offset-4">
              Envoyer ma sélection à l'agence
            </a>
            .
          </p>
        </div>
      )}

      {query.isLoading && (
        <>
          <SearchThinkingState
            label="Recherche en cours"
            details="Nous préparons les annonces correspondant à vos critères."
            className="mt-6 w-fit max-w-full"
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[320px] animate-pulse rounded-2xl bg-muted/60" />
            ))}
          </div>
        </>
      )}

      {query.isError && (
        <div className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <p className="text-sm">Une erreur est survenue lors du chargement des annonces.</p>
        </div>
      )}

      {!query.isLoading && !query.isError && query.data && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={resultsKey}
            initial={resultsMotion.initial}
            animate={resultsMotion.animate}
            exit={resultsMotion.exit}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {query.data.items.length === 0 ? (
              <>
              <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="no-results-title">
                <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)] lg:gap-10">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-strong">On élargit la recherche</p>
                    <h2 id="no-results-title" className="mt-2 font-display text-3xl">
                      {locationGuide
                        ? `Aucun bien à ${locationGuide.name} ne correspond à ces critères.`
                        : "Aucun bien ne correspond à tous ces critères."}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      Essayez l’une de ces pistes, ou modifiez vos filtres pour explorer davantage d’annonces.
                    </p>
                  </div>

                  <div className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <p className="text-sm font-medium">Quelques essais utiles</p>
                    {recoveryActions.length > 0 ? (
                      <div className="mt-3 flex flex-col gap-2">
                        {recoveryActions.slice(0, 3).map((action) => (
                          <button
                            key={action.label}
                            type="button"
                            onClick={() => updateFilters(action.filters)}
                            className="min-h-11 rounded-xl border border-border px-4 py-2.5 text-left text-sm font-medium transition-colors hover:border-brand-border hover:bg-brand-soft/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        Aucun ajustement automatique n’est disponible pour cette recherche.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/25 px-6 py-4 sm:px-8">
                  <Button variant="brand" onClick={() => setSearchDrawerOpen(true)}>
                    Modifier mes filtres
                  </Button>
                  <Button variant="outline" onClick={clearAllCriteria}>
                    Effacer les critères
                  </Button>
                  <Link to="/geographie" className="text-sm font-medium text-brand-strong underline-offset-4 hover:underline">
                    Explorer les secteurs
                  </Link>
                </div>
              </section>
              {locationGuide && (
                <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8" aria-labelledby="location-guide-title">
                  <header className="mb-6 max-w-3xl">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-strong">Repères sur le secteur</p>
                    <h2 id="location-guide-title" className="mt-2 font-display text-3xl">Vivre {atLocation(locationGuide.name)}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{locationGuide.subtitle} · {locationGuide.area}</p>
                  </header>
                  <GeographyGuideDetails guide={locationGuide} />
                </section>
              )}
              </>
            ) : (
              <>
                {viewMode === "map" ? (
                  <PropertyMapSplitView
                    items={query.data.items}
                    page={query.data.page}
                    pageSize={query.data.pageSize}
                    total={query.data.total}
                    onPageChange={(page) => updateFilters({ page })}
                  />
                ) : (
                  <>
                    <div className={viewMode === "grid" ? "mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "mt-4 space-y-4"}>
                      {query.data.items.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={
                            reducedMotion
                              ? { opacity: 1 }
                              : isPriceSort
                                ? { opacity: 0, y: sortDirection > 0 ? 20 : 12, scale: 0.975, filter: "blur(10px)" }
                                : { opacity: 0, y: 10 }
                          }
                          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                          transition={{
                            duration: isPriceSort ? 0.36 : 0.2,
                            delay: isPriceSort ? Math.min(index * 0.045, 0.26) : 0,
                            ease: isPriceSort ? [0.22, 1, 0.36, 1] : "easeOut",
                          }}
                        >
                          <ListingCard item={item} browseItems={query.data.items} viewMode={viewMode} revealIndex={index} eagerImage={index === 0} />
                        </motion.div>
                      ))}
                    </div>

                    <PaginationBar
                      page={query.data.page}
                      pageSize={query.data.pageSize}
                      total={query.data.total}
                      onChange={(page) => updateFilters({ page })}
                    />
                  </>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}
      </section>
    </>
  );
}
