import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { searchProperties } from "@/features/listings/api/properties.service";
import { ActiveFiltersChips } from "@/features/listings/components/ActiveFiltersChips";
import { FiltersBar } from "@/features/listings/components/FiltersBar";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { PaginationBar } from "@/features/listings/components/PaginationBar";
import { buildSearchParams, parseSearchParams } from "@/features/listings/utils/query";
import type { PropertySearchParams } from "@/types/api";
import { useFavoritesStore } from "@/features/favorites/useFavoritesStore";
import { useUiStore } from "@/lib/state/useUiStore";
import { getSiteUrl, useSeo } from "@/lib/seo/useSeo";
import { toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";

const defaultParams: PropertySearchParams = {
  page: 1,
  pageSize: 12,
  sort: "newest",
};

export default function ListingsIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { reducedMotion } = useMotionPreference();
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);
  const favoriteIds = useFavoritesStore((state) => state.ids);
  const siteUrl = getSiteUrl();

  const filters = useMemo(() => {
    const parsed = parseSearchParams(searchParams);
    return { ...defaultParams, ...parsed };
  }, [searchParams]);

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
    setSearchParams(buildSearchParams(next));
  };

  const clearFilter = (key: keyof PropertySearchParams) => {
    const next: PropertySearchParams = { ...filters, [key]: undefined };
    next.page = 1;
    setSearchParams(buildSearchParams(next));
  };

  useSeo({
    title: "Biens immobiliers | Foch Immobilier",
    description: "Découvrez nos biens à la vente et à la location au Havre et sur le littoral.",
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
    <section className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Biens</p>
        <h1 className="mt-2 font-display text-4xl">Tous nos biens</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Affinez votre recherche avec des filtres avancés et accédez rapidement aux biens d'exception qui correspondent à vos critères.
        </p>
      </header>

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
        onClearAll={() => setSearchParams(buildSearchParams(defaultParams))}
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
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[320px] animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
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
              <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
                <p className="font-display text-2xl">Aucun bien ne correspond à ces critères.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Élargissez vos critères ou contactez l'agence pour bénéficier d'un accompagnement sur mesure.
                </p>
                <Button className="mt-4" variant="brand" asChild>
                  <a href="/contact">Nous contacter</a>
                </Button>
              </div>
            ) : (
              <>
                <div className={viewMode === "grid" ? "mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "mt-4 space-y-4"}>
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
                      <ListingCard item={item} viewMode={viewMode} revealIndex={index} />
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
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}
