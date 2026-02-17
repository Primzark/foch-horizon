import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
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
import { useSeo } from "@/lib/seo/useSeo";

const defaultParams: PropertySearchParams = {
  page: 1,
  pageSize: 12,
  sort: "newest",
};

export default function ListingsIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortDirection, setSortDirection] = useState<-1 | 0 | 1>(0);
  const sectionRef = useRef<HTMLElement | null>(null);
  const previousSortRef = useRef<PropertySearchParams["sort"]>(defaultParams.sort);
  const reducedMotion = useReducedMotion();
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);
  const favoriteIds = useFavoritesStore((state) => state.ids);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const primaryBlobShift = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : -70]);
  const secondaryBlobShift = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : 80]);

  const filters = useMemo(() => {
    const parsed = parseSearchParams(searchParams);
    return { ...defaultParams, ...parsed };
  }, [searchParams]);

  const query = useQuery({
    queryKey: ["properties", filters],
    queryFn: () => searchProperties(filters),
  });

  useEffect(() => {
    const currentSort = filters.sort ?? defaultParams.sort;
    const previousSort = previousSortRef.current ?? defaultParams.sort;

    if (currentSort !== previousSort) {
      if (currentSort === "price_asc") {
        setSortDirection(-1);
      } else if (currentSort === "price_desc" || currentSort === "surface_desc") {
        setSortDirection(1);
      } else {
        setSortDirection(0);
      }
      previousSortRef.current = currentSort;
    }
  }, [filters.sort]);

  const directionalOffset = sortDirection === 0 ? 10 : sortDirection * 20;
  const resultsMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: directionalOffset, filter: "blur(2px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -directionalOffset, filter: "blur(2px)" },
      };

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
    description: "Tous nos biens à la vente et à la location dans la région du Havre.",
    canonicalPath: "/biens",
    noIndex: Boolean(filters.features?.length),
  });

  return (
    <section ref={sectionRef} className="relative container mx-auto overflow-hidden px-4 py-8">
      <div className="pointer-events-none fixed inset-x-0 top-[74px] z-40 hidden h-px bg-border/60 lg:block">
        <motion.span
          className="block h-full origin-left bg-gradient-to-r from-accent via-accent/80 to-transparent"
          style={{ scaleX: scrollYProgress }}
        />
      </div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-20 h-64 w-64 rounded-full bg-accent/12 blur-3xl"
        style={{ y: primaryBlobShift }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-foreground/[0.04] blur-3xl"
        style={{ y: secondaryBlobShift }}
      />

      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Biens</p>
        <h1 className="mt-2 font-display text-4xl">Tous nos biens</h1>
        <p className="mt-2 text-sm text-muted-foreground">Affinez votre recherche avec des filtres avancés et des liens partageables.</p>
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
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm">
          <p>
            Vous avez sauvegardé {favoriteIds.length} biens. Besoin d'un avis personnalisé ?{" "}
            <a href="/contact" className="underline underline-offset-4">
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
                  Essayez d'élargir la recherche ou contactez l'agence pour un accompagnement personnalisé.
                </p>
                <Button className="mt-4" asChild>
                  <a href="/contact">Nous contacter</a>
                </Button>
              </div>
            ) : (
              <>
                <div className={viewMode === "grid" ? "mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "mt-4 space-y-4"}>
                  {query.data.items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: directionalOffset * 0.55 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.22,
                        delay: Math.min(index * 0.04, 0.24),
                        ease: "easeOut",
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
