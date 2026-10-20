import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import { searchGeographyGuides } from "@/features/content/utils/geographyGuideSearch";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice, formatPropertyTypeLabel, normalizeKeyword, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { buildSearchParams, parseSearchParams } from "@/features/listings/utils/query";
import { searchProperties } from "@/features/listings/api/properties.service";
import { properties } from "@/features/listings/data/properties";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { createPropertyModalRouteState } from "@/features/listings/navigation/propertyModalNavigation";
import { persistAppliedPropertySearchFilters, resolvePropertySearchFilters } from "@/features/listings/utils/searchFilterPersistence";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";
import { SpotlightSearchCriteria } from "@/features/listings/components/SpotlightSearchCriteria";
import type { PropertySearchItem, PropertySearchParams, PropertySearchResponse } from "@/types/api";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";

type SearchableProperty = PropertySearchItem & { description?: string };

const popularSearches: Array<{ label: string; filters: Partial<PropertySearchParams> }> = [
  { label: "Le Havre", filters: { q: "Le Havre" } },
  { label: "Sainte-Adresse", filters: { q: "Sainte-Adresse" } },
  { label: "Vue mer", filters: { q: "vue mer" } },
  { label: "Maison", filters: { type: "maison_villa" } },
];

const defaultSearchFilters: PropertySearchParams = {
  transaction: "vente",
  page: 1,
  pageSize: 12,
  sort: "newest",
};

interface SpotlightSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement>;
}

export function SpotlightSearchModal({ open, onOpenChange, triggerRef }: SpotlightSearchModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { reducedMotion } = useMotionPreference();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<PropertySearchParams>(defaultSearchFilters);

  const seedItems = useMemo<SearchableProperty[]>(
    () => properties
      .filter((property) => property.status !== "off_market" && property.status !== "sold")
      .map((property) => ({ ...toSearchItem(property), description: property.description })),
    [],
  );

  const inventoryQuery = useQuery({
    queryKey: ["main-search-inventory"],
    queryFn: () => searchProperties({ page: 1, pageSize: 48, sort: "newest" }),
    enabled: open,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const queryText = query.trim();
  const guideSuggestions = useMemo(() => searchGeographyGuides(queryText), [queryText]);
  const searchableInventory = useMemo(() => {
    const itemsById = new Map<number, SearchableProperty>();
    seedItems.forEach((item) => itemsById.set(item.id, item));
    inventoryQuery.data?.items.forEach((item) => {
      const seedItem = itemsById.get(item.id);
      itemsById.set(item.id, { ...seedItem, ...item, description: seedItem?.description });
    });

    return Array.from(itemsById.values()).map((item) => ({
      item,
      searchableText: normalizeKeyword(
        [item.title, item.slug, item.description, item.city.name, item.city.slug, item.city.postalCode, String(item.id), formatPropertyTypeLabel(item.type)]
          .join(" ")
          .replace(/[-_/]+/g, " "),
      ),
    }));
  }, [inventoryQuery.data, seedItems]);

  const suggestions = useMemo(() => {
    const terms = normalizeKeyword(queryText).replace(/[-_]+/g, " ").split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    return searchableInventory
      .filter(({ item, searchableText }) => item.transaction === "vente" && terms.every((term) => searchableText.includes(term)))
      .map(({ item }) => item)
      .slice(0, 6);
  }, [queryText, searchableInventory]);
  const showSuggestions = queryText.length >= 2;
  const browseOptionIndex = guideSuggestions.length + suggestions.length;
  const resultCountFilters = useMemo<PropertySearchParams>(() => ({
    ...draftFilters,
    transaction: "vente",
    q: queryText || undefined,
    page: 1,
    pageSize: 1,
  }), [draftFilters, queryText]);
  const resultCount = useQuery({
    queryKey: ["property-search-result-count", resultCountFilters],
    queryFn: () => searchProperties(resultCountFilters),
    enabled: open && advancedOpen,
    staleTime: 30_000,
  });
  const resultCountValue = resultCount.data?.total;
  const resultCountNumber = resultCountValue?.toLocaleString("fr-FR") ?? (resultCount.isError ? "—" : "…");
  const resultCountPrefix = resultCountValue === 1 ? "Voir" : "Voir les";
  const resultCountSuffix = resultCountValue === 1 ? "résultat" : "résultats";
  const resultCountAccessibleLabel = resultCountValue == null
    ? resultCount.isError ? "Voir les résultats, disponibilité indisponible" : "Voir les résultats, calcul en cours"
    : `${resultCountPrefix} ${resultCountNumber} ${resultCountSuffix}`;

  useEffect(() => {
    setActiveIndex(-1);
  }, [queryText, inventoryQuery.data]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDraftFilters(defaultSearchFilters);
      setAdvancedOpen(false);
      return;
    }

    const parsedFilters = resolvePropertySearchFilters(location.search);
    setDraftFilters({ ...defaultSearchFilters, ...parsedFilters, transaction: "vente" });
    setQuery(parsedFilters.q ?? "");
  }, [location.search, open]);

  const navigateToSearch = (filters: Partial<PropertySearchParams>, resetFilters = false) => {
    const baseFilters = resetFilters ? defaultSearchFilters : draftFilters;
    const appliedFilters: PropertySearchParams = {
      ...baseFilters,
      ...filters,
      transaction: "vente",
      page: 1,
      pageSize: 12,
      sort: filters.sort ?? baseFilters.sort ?? "newest",
    };
    const searchParams = buildSearchParams({
      ...appliedFilters,
    });

    const containsOnlyTextSearch = Object.entries(appliedFilters).every(([key, value]) =>
      value == null || ["q", "transaction", "page", "pageSize", "sort"].includes(key),
    );

    if (queryText.length >= 2 && appliedFilters.q === queryText && containsOnlyTextSearch) {
      const parsedFilters = parseSearchParams(searchParams);
      const definedFilters = Object.fromEntries(
        Object.entries(parsedFilters).filter(([, value]) => value !== undefined),
      ) as PropertySearchParams;
      const searchFilters: PropertySearchParams = {
        page: 1,
        pageSize: 12,
        sort: "newest",
        ...definedFilters,
      };
      const terms = normalizeKeyword(queryText).replace(/[-_]+/g, " ").split(/\s+/).filter(Boolean);
      const matchingItems = searchableInventory
        .filter(({ item, searchableText }) => item.transaction === "vente" && terms.every((term) => searchableText.includes(term)))
        .map(({ item }) => item);
      const initialResults: PropertySearchResponse = {
        page: 1,
        pageSize: 12,
        total: matchingItems.length,
        items: matchingItems.slice(0, 12),
      };

      queryClient.setQueryData(["properties", searchFilters], initialResults);
      void queryClient.invalidateQueries({ queryKey: ["properties", searchFilters], exact: true, refetchType: "none" });
    }

    persistAppliedPropertySearchFilters(appliedFilters);
    onOpenChange(false);
    navigate({ pathname: "/biens", search: searchParams.toString() });
  };

  const openSuggestion = (index: number) => {
    if (index < guideSuggestions.length) {
      const guide = guideSuggestions[index];
      if (!guide) return;
      onOpenChange(false);
      navigate(`/immobilier/${guide.id}`);
      return;
    }

    const suggestion = suggestions[index - guideSuggestions.length];
    if (!suggestion) return;

    onOpenChange(false);
    navigate(toCanonicalPropertyPath(suggestion), {
      state: createPropertyModalRouteState(location, suggestion, suggestions),
    });
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (advancedOpen) {
      if (event.key === "Enter") {
        event.preventDefault();
        navigateToSearch({ ...draftFilters, q: queryText || undefined });
      }
      return;
    }

    if (!showSuggestions) {
      if (event.key === "Enter" && queryText) {
        event.preventDefault();
        navigateToSearch({ q: queryText });
      }
      return;
    }

    const optionCount = guideSuggestions.length + suggestions.length + 1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % optionCount);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? optionCount - 1 : current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < guideSuggestions.length + suggestions.length) {
        openSuggestion(activeIndex);
      } else {
        navigateToSearch({ q: queryText });
      }
    }
  };

  const activeOptionId = activeIndex < 0
    ? undefined
    : activeIndex < guideSuggestions.length
      ? `spotlight-search-guide-${guideSuggestions[activeIndex]?.id}`
      : activeIndex < guideSuggestions.length + suggestions.length
        ? `spotlight-search-suggestion-${suggestions[activeIndex - guideSuggestions.length]?.id}`
      : "spotlight-search-browse-option";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className={`max-h-[calc(100dvh-1rem)] w-[calc(100%-1.25rem)] max-w-2xl gap-0 overflow-hidden rounded-2xl border border-border/80 bg-background/95 p-0 text-foreground shadow-[0_28px_100px_-30px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:rounded-[1.4rem] ${reducedMotion ? "data-[state=open]:animate-none data-[state=closed]:animate-none" : ""}`}
        overlayClassName="bg-slate-950/55 backdrop-blur-[2px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Rechercher un bien</DialogTitle>
          <DialogDescription>Recherchez par ville, quartier, type de bien ou référence.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b border-border/80 px-4 sm:px-5">
          <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-strong" />
          <label htmlFor="spotlight-property-search" className="sr-only">
            Ville, quartier, type de bien ou référence
          </label>
          <input
            ref={inputRef}
            id="spotlight-property-search"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions && !advancedOpen}
            aria-controls={showSuggestions && !advancedOpen ? "spotlight-search-options" : undefined}
            aria-activedescendant={showSuggestions && !advancedOpen ? activeOptionId : undefined}
            autoComplete="off"
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              setDraftFilters((current) => ({ ...current, q: value.trim() || undefined }));
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Ville, quartier, type ou référence…"
            className="h-[4.5rem] min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-lg"
          />
          <kbd className="hidden shrink-0 rounded-md border border-border bg-muted/50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline-flex">
            Esc
          </kbd>
          <DialogClose asChild>
            <button type="button" aria-label="Fermer la recherche" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </DialogClose>
        </div>

        <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {advancedOpen ? "Affiner votre recherche" : showSuggestions ? "Suggestions" : "Recherches populaires"}
          </p>
          {!advancedOpen && showSuggestions && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {inventoryQuery.isLoading && suggestions.length === 0
                ? "Recherche…"
                : `${guideSuggestions.length + suggestions.length} suggestion${guideSuggestions.length + suggestions.length === 1 ? "" : "s"}`}
            </p>
          )}
        </div>

        {advancedOpen ? (
          <form
            id="spotlight-search-criteria-form"
            onSubmit={(event) => {
              event.preventDefault();
              navigateToSearch({ ...draftFilters, q: queryText || undefined });
            }}
            className="max-h-[min(65vh,34rem)] overflow-y-auto px-4 pb-5 pt-3 sm:px-5"
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(defaultSearchFilters);
                  setQuery("");
                }}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
              >
                Réinitialiser
              </button>
            </div>
            <SpotlightSearchCriteria
              filters={draftFilters}
              onChange={(updates) => setDraftFilters((current) => ({ ...current, ...updates }))}
              onQueryChange={setQuery}
            />
          </form>
        ) : (
          <div className="max-h-[min(55vh,28rem)] min-h-44 overflow-y-auto px-2 pb-2">
          {showSuggestions ? (
            <div id="spotlight-search-options" role="listbox" aria-label="Pages locales et biens correspondants" className="space-y-0.5">
              {guideSuggestions.length > 0 && (
                <div role="group" aria-label="Pages locales" className="space-y-0.5">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Pages locales
                  </p>
                  {guideSuggestions.map((guide, index) => (
                    <button
                      key={guide.id}
                      id={`spotlight-search-guide-${guide.id}`}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === index}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => openSuggestion(index)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                        activeIndex === index ? "bg-brand-soft/70" : "hover:bg-muted/70"
                      }`}
                    >
                      <span className="block truncate text-sm font-medium">{guide.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">Page locale</span>
                    </button>
                  ))}
                </div>
              )}

              {suggestions.length > 0 && (
                <div role="group" aria-label="Biens correspondants" className="space-y-0.5">
                  <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Biens correspondants
                  </p>
                  {suggestions.map((suggestion, index) => {
                    const optionIndex = guideSuggestions.length + index;
                    return (
                      <button
                        key={suggestion.id}
                        id={`spotlight-search-suggestion-${suggestion.id}`}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === optionIndex}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => openSuggestion(optionIndex)}
                        className={`grid w-full grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${activeIndex === optionIndex ? "bg-brand-soft/70" : "hover:bg-muted/70"}`}
                      >
                        {suggestion.coverImageUrl ? (
                          <img
                            src={getPropertyImageUrl(suggestion.coverImageUrl, 200)}
                            srcSet={getPropertyImageSrcSet(suggestion.coverImageUrl, [200, 400])}
                            sizes="60px"
                            alt=""
                            className="h-12 w-[3.75rem] rounded-lg object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span aria-hidden="true" className="h-12 w-[3.75rem] rounded-lg bg-muted" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{suggestion.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {suggestion.city.name} · {formatPropertyTypeLabel(suggestion.type)}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums">
                          {formatPrice(suggestion.priceAmount, suggestion.transaction)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {suggestions.length === 0 && inventoryQuery.isLoading && (
                <p role="status" className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Recherche dans les annonces…
                </p>
              )}

              {suggestions.length === 0 && inventoryQuery.isFetched && (
                <p role="status" className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Aucun bien trouvé pour « {queryText} ».
                </p>
              )}

              <button
                id="spotlight-search-browse-option"
                type="button"
                role="option"
                aria-selected={activeIndex === browseOptionIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => navigateToSearch({ q: queryText })}
                className={`mt-1 flex w-full items-center justify-between gap-3 border-t border-border px-3 py-3 text-left text-sm text-brand-strong transition-colors ${activeIndex === browseOptionIndex ? "bg-brand-soft/70" : "hover:bg-brand-soft/50"}`}
              >
                <span>Voir tous les résultats pour « {queryText} »</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          ) : queryText.length > 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Continuez à saisir pour rechercher dans les annonces.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 px-2 pb-2">
              {popularSearches.map((search) => (
                <button
                  key={search.label}
                  type="button"
                  onClick={() => navigateToSearch(search.filters)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-sm transition-colors hover:border-brand-border hover:bg-brand-soft/60 hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
                >
                  {search.label}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border/80 bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
          <span className="hidden sm:inline">
            {advancedOpen ? "Choisissez vos critères" : "↑ ↓ naviguer · Entrée ouvrir"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-expanded={advancedOpen}
              aria-controls={advancedOpen ? "spotlight-search-criteria-form" : undefined}
              onClick={() => {
                setActiveIndex(-1);
                setAdvancedOpen((current) => !current);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              {advancedOpen ? "Masquer les critères" : "Plus de critères"}
            </button>
            {advancedOpen ? (
              <button
                type="submit"
                form="spotlight-search-criteria-form"
                aria-label={resultCountAccessibleLabel}
                className="inline-flex shrink-0 items-center gap-0 rounded-full bg-brand-strong px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-strong/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2"
              >
                {resultCountPrefix}{" "}
                <span aria-live="polite" className="text-xs font-normal tabular-nums opacity-85">
                  {resultCountNumber}
                </span>{" "}
                {resultCountSuffix}
              </button>
            ) : (
              <button type="button" onClick={() => navigateToSearch({}, true)} className="shrink-0 rounded-full px-3 py-2 font-medium text-foreground transition-colors hover:bg-muted hover:text-brand-strong">
                Tous les biens
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
