import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, House, Search, SlidersHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AnimatedGuideSuggestionGroup,
  AnimatedPropertySuggestionGroup,
  SearchSuggestionCategorySwitch,
  SearchSuggestionCrossfade,
  SearchSuggestionPanel,
  SearchSuggestionResults,
  type SearchSuggestionCategory,
} from "@/features/content/components/AnimatedSearchSuggestions";
import { useUiStore } from "@/lib/state/useUiStore";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { searchGeographyGuides } from "@/features/content/utils/geographyGuideSearch";
import { buildSearchParams, parseSearchParams } from "@/features/listings/utils/query";
import { searchProperties } from "@/features/listings/api/properties.service";
import { formatPropertyTypeLabel, normalizeKeyword, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import type { PropertySearchItem, PropertySearchParams, PropertySearchResponse } from "@/types/api";
import type { TransactionType } from "@/types/domain";
import { createPropertyModalRouteState } from "@/features/listings/navigation/propertyModalNavigation";
import { persistAppliedPropertySearchFilters, readLastAppliedPropertySearchFilters } from "@/features/listings/utils/searchFilterPersistence";
import { SearchThinkingState } from "@/features/content/components/SearchThinkingState";

const searchPrompts = ["Le Havre", "Sainte-Adresse", "Montivilliers", "vue mer"];
export type MainSearchSeedItem = PropertySearchItem & { description?: string };

interface MainSearchBarProps {
  seedItems?: MainSearchSeedItem[];
}

export function MainSearchBar({ seedItems = [] }: MainSearchBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const { reducedMotion } = useMotionPreference();
  const transaction: TransactionType = "vente";
  const [query, setQuery] = useState(() => readLastAppliedPropertySearchFilters()?.q ?? "");
  const [promptIndex, setPromptIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [suggestionCategory, setSuggestionCategory] = useState<SearchSuggestionCategory>("all");

  const inventoryQuery = useQuery({
    queryKey: ["main-search-inventory"],
    queryFn: () => searchProperties({ page: 1, pageSize: 48, sort: "newest" }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const queryText = query.trim();
  const guideSuggestions = useMemo(() => searchGeographyGuides(queryText), [queryText]);
  const searchableInventory = useMemo(() => {
    const itemsById = new Map<number, MainSearchSeedItem>();
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
      .filter(({ item, searchableText }) => item.transaction === transaction && terms.every((term) => searchableText.includes(term)))
      .map(({ item }) => item)
      .slice(0, 5);
  }, [queryText, searchableInventory, transaction]);
  const visibleGuideSuggestions = suggestionCategory === "properties" ? [] : guideSuggestions;
  const visiblePropertySuggestions = suggestionCategory === "guides" ? [] : suggestions;
  const browseOptionIndex = visibleGuideSuggestions.length + visiblePropertySuggestions.length;
  const optionCount = browseOptionIndex + 1;
  const showSuggestions = focused && !suggestionsDismissed && queryText.length >= 2;

  useEffect(() => {
    if (reducedMotion || focused || query) return;

    const timer = window.setInterval(() => {
      setPromptIndex((current) => (current + 1) % searchPrompts.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [focused, query, reducedMotion]);

  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [query, transaction, inventoryQuery.data]);

  useEffect(() => {
    setQuery(readLastAppliedPropertySearchFilters()?.q ?? "");
  }, [location.pathname, location.search]);

  const navigateToResults = () => {
    const previousFilters = readLastAppliedPropertySearchFilters() ?? {};
    const searchParams = buildSearchParams({
      ...previousFilters,
      transaction,
      q: queryText || undefined,
      page: 1,
      pageSize: 12,
      sort: previousFilters.sort ?? "newest",
    });
    const parsedFilters = parseSearchParams(searchParams);
    const definedFilters = Object.fromEntries(
      Object.entries(parsedFilters).filter(([, value]) => value !== undefined),
    ) as PropertySearchParams;
    const filters: PropertySearchParams = {
      page: 1,
      pageSize: 12,
      sort: "newest",
      ...definedFilters,
    };
    const canSeedTextOnlyResults = Object.entries(filters).every(([key, value]) =>
      value == null || ["q", "transaction", "page", "pageSize", "sort"].includes(key),
    ) && (filters.sort == null || filters.sort === "newest");
    if (queryText.length >= 2 && canSeedTextOnlyResults) {
      const terms = normalizeKeyword(queryText).replace(/[-_]+/g, " ").split(/\s+/).filter(Boolean);
      const matchingItems = searchableInventory
        .filter(({ item, searchableText }) => item.transaction === transaction && terms.every((term) => searchableText.includes(term)))
        .map(({ item }) => item);
      const initialResults: PropertySearchResponse = {
        page: 1,
        pageSize: 12,
        total: matchingItems.length,
        items: matchingItems.slice(0, 12),
      };

      queryClient.setQueryData(["properties", filters], initialResults);
      void queryClient.invalidateQueries({ queryKey: ["properties", filters], exact: true, refetchType: "none" });
    }

    persistAppliedPropertySearchFilters(filters);
    navigate({ pathname: "/biens", search: searchParams.toString() });
  };

  const openSuggestion = (index: number) => {
    if (index < guideSuggestions.length) {
      const guide = guideSuggestions[index];
      if (!guide) return;
      navigate(`/immobilier/${guide.id}`);
      setFocused(false);
      return;
    }

    const propertyIndex = index - guideSuggestions.length;
    const suggestion = suggestions[propertyIndex];
    if (!suggestion) {
      if (index === guideSuggestions.length + suggestions.length) navigateToResults();
      return;
    }
    navigate(toCanonicalPropertyPath(suggestion), {
      state: createPropertyModalRouteState(location, suggestion, suggestions),
    });
    setFocused(false);
  };

  const openVisibleSuggestion = (index: number) => {
    openSuggestion(suggestionCategory === "properties" ? index + guideSuggestions.length : index);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToResults();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setSuggestionsDismissed(true);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      if (optionCount === 0) return;
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % optionCount);
      return;
    }

    if (event.key === "ArrowUp") {
      if (optionCount === 0) return;
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current <= 0 ? optionCount - 1 : current - 1));
      return;
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      if (activeSuggestionIndex < browseOptionIndex) {
        openVisibleSuggestion(activeSuggestionIndex);
      } else if (activeSuggestionIndex === browseOptionIndex) {
        navigateToResults();
      }
    }
  };

  const activeOptionId = activeSuggestionIndex < 0
    ? undefined
    : activeSuggestionIndex < visibleGuideSuggestions.length
      ? `main-search-guide-${visibleGuideSuggestions[activeSuggestionIndex]?.id}`
      : activeSuggestionIndex < browseOptionIndex
        ? `main-search-suggestion-${visiblePropertySuggestions[activeSuggestionIndex - visibleGuideSuggestions.length]?.id}`
        : activeSuggestionIndex === browseOptionIndex
          ? "main-search-browse-option"
          : undefined;

  return (
    <div className="w-full max-w-3xl">
      <div className="relative z-20">
        <form
          action="/biens"
          method="get"
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/70 bg-background/95 p-3 shadow-[0_18px_55px_-25px_rgba(5,20,26,0.7)] backdrop-blur-md sm:rounded-full sm:p-2"
        >
          <input type="hidden" name="transaction" value="vente" />
          <div className="flex items-center gap-2">
            <div className="hidden w-fit shrink-0 items-center rounded-full bg-muted/80 p-1 sm:flex">
              <span className="group inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                <motion.span
                  aria-hidden="true"
                  whileHover={reducedMotion ? undefined : { y: -2, rotate: -7, scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 420, damping: 14 }}
                  className="inline-flex"
                >
                  <House className="h-4 w-4 text-brand-strong" />
                </motion.span>
                Acheter
              </span>
            </div>

            <div className="relative flex min-w-0 flex-1 items-center px-2 sm:pl-4">
              <label htmlFor="main-property-search" className="sr-only">
                Ville, quartier, type de bien ou référence
              </label>
              <input
                ref={inputRef}
                id="main-property-search"
                name="q"
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls={showSuggestions ? "main-search-suggestions" : undefined}
                aria-activedescendant={showSuggestions ? activeOptionId : undefined}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSuggestionsDismissed(false);
                }}
                onFocus={() => {
                  setFocused(true);
                  setSuggestionsDismissed(false);
                }}
                onBlur={(event) => {
                  const suggestionsPanel = event.currentTarget.form?.parentElement?.querySelector("#main-search-suggestion-panel");
                  if (event.relatedTarget instanceof Node && suggestionsPanel?.contains(event.relatedTarget)) return;
                  window.setTimeout(() => setFocused(false), 120);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder=""
                autoComplete="off"
                className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 sm:h-14"
              />
              {!query && !focused && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2 right-2 top-1/2 -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap text-base text-muted-foreground sm:left-4"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={reducedMotion ? "static" : promptIndex}
                      initial={reducedMotion ? false : { opacity: 0, y: 9 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, y: -9 }}
                      transition={{ duration: reducedMotion ? 0 : 0.24, ease: "easeOut" }}
                      className="inline-block"
                    >
                      {searchPrompts[reducedMotion ? 0 : promptIndex]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              )}
            </div>

            <Button
              type="submit"
              variant="brand"
              size="icon"
              aria-label="Rechercher"
              className="h-12 w-12 shrink-0 rounded-full p-0 sm:h-14 sm:w-14"
            >
              <Search aria-hidden="true" className="h-5 w-5" />
              <span className="sr-only">Rechercher</span>
            </Button>
          </div>
        </form>

        <SearchSuggestionPanel
          isVisible={showSuggestions}
          id="main-search-suggestion-panel"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-xl"
          onBlur={(event) => {
            const nextTarget = event.relatedTarget;
            if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
              setFocused(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            inputRef.current?.focus();
            setSuggestionsDismissed(true);
            setActiveSuggestionIndex(-1);
          }}
        >
          <SearchSuggestionCategorySwitch
            activeCategory={suggestionCategory}
            guideCount={guideSuggestions.length}
            propertyCount={suggestions.length}
            reducedMotion={reducedMotion}
            className="mx-2 mt-2"
            onChange={(category) => {
              setSuggestionCategory(category);
              setActiveSuggestionIndex(-1);
            }}
          />

          <SearchSuggestionResults reducedMotion={reducedMotion}>
          {visiblePropertySuggestions.length === 0 && suggestionCategory !== "guides" && inventoryQuery.isLoading && (
            <div className="p-2">
              <SearchThinkingState
                label="Je recherche les biens"
                details="Je vérifie les annonces correspondant à votre recherche."
                className="max-w-full"
              />
            </div>
          )}
          <div id="main-search-suggestions" role="listbox" aria-label="Pages locales et biens correspondants" className="grid max-h-[min(24rem,60vh)] grid-cols-1 overflow-y-auto p-2">
            <SearchSuggestionCrossfade category={suggestionCategory} reducedMotion={reducedMotion}>
              <AnimatedGuideSuggestionGroup
                guides={visibleGuideSuggestions}
                activeIndex={activeSuggestionIndex}
                idPrefix="main-search-guide"
                reducedMotion={reducedMotion}
                showHeading={suggestionCategory === "all"}
                onSelect={openVisibleSuggestion}
              />

              <AnimatedPropertySuggestionGroup
                properties={visiblePropertySuggestions}
                activeIndex={activeSuggestionIndex}
                optionIndexOffset={visibleGuideSuggestions.length}
                staggerIndexOffset={suggestionCategory === "all" ? visibleGuideSuggestions.length : 0}
                idPrefix="main-search-suggestion"
                reducedMotion={reducedMotion}
                variant="main"
                showHeading={suggestionCategory === "all"}
                onSelect={openVisibleSuggestion}
              />

              {visiblePropertySuggestions.length === 0 &&
                visibleGuideSuggestions.length === 0 &&
                suggestionCategory !== "guides" &&
                inventoryQuery.isFetched && (
                  <p role="status" className="px-3 py-4 text-sm text-muted-foreground">
                    Aucun bien trouvé pour « {queryText} ».
                  </p>
                )}

              {suggestionCategory === "guides" && visibleGuideSuggestions.length === 0 && (
                <p role="status" className="px-3 py-4 text-sm text-muted-foreground">
                  Aucune page locale trouvée pour « {queryText} ».
                </p>
              )}

              <button
                id="main-search-browse-option"
                type="button"
                role="option"
                aria-selected={activeSuggestionIndex === browseOptionIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={navigateToResults}
                className={`mt-1 flex w-full items-center gap-2 rounded-xl border-t border-border px-3 py-3 text-left text-sm text-brand-strong transition-colors hover:bg-brand-soft/60 focus-visible:bg-brand-soft/60 ${
                  activeSuggestionIndex === browseOptionIndex ? "bg-brand-soft/60" : ""
                }`}
                style={{ transitionDuration: reducedMotion ? "0ms" : "160ms" }}
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate">Voir tous les résultats pour « {queryText} »</span>
              </button>
            </SearchSuggestionCrossfade>
          </div>
          </SearchSuggestionResults>
        </SearchSuggestionPanel>
      </div>

      <div className="mt-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSearchDrawerOpen(true)}
            className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-white/80 bg-transparent px-4 py-2 text-sm font-semibold text-white/95 shadow-[0_8px_22px_-8px_rgba(7,40,25,0.65)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/30"
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            Plus de critères
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
