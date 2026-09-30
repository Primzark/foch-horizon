import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/state/useUiStore";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { buildSearchParams, parseSearchParams } from "@/features/listings/utils/query";
import { searchProperties } from "@/features/listings/api/properties.service";
import { formatPrice, formatPropertyTypeLabel, normalizeKeyword, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import type { PropertySearchItem, PropertySearchParams, PropertySearchResponse } from "@/types/api";
import type { TransactionType } from "@/types/domain";

const searchPrompts = ["Le Havre", "Sainte-Adresse", "Montivilliers", "vue mer"];
const searchShortcuts: Array<{ label: string; filters: Partial<PropertySearchParams> }> = [
  { label: "Vue mer", filters: { q: "vue mer" } },
  { label: "Balcon / terrasse", filters: { features: ["balcon"] } },
  { label: "Maison", filters: { type: "maison_villa" } },
  { label: "Jardin", filters: { q: "jardin" } },
  { label: "Garage", filters: { garagesMin: 1 } },
];

export type MainSearchSeedItem = PropertySearchItem & { description?: string };

interface MainSearchBarProps {
  seedItems?: MainSearchSeedItem[];
}

export function MainSearchBar({ seedItems = [] }: MainSearchBarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);
  const { reducedMotion } = useMotionPreference();
  const transaction: TransactionType = "vente";
  const [query, setQuery] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const inventoryQuery = useQuery({
    queryKey: ["main-search-inventory"],
    queryFn: () => searchProperties({ page: 1, pageSize: 48, sort: "newest" }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const queryText = query.trim();
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

  const navigateToResults = () => {
    const searchParams = buildSearchParams({
      transaction,
      q: queryText || undefined,
      page: 1,
      pageSize: 12,
      sort: "newest",
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

    navigate({ pathname: "/biens", search: searchParams.toString() });
  };

  const navigateToShortcut = (shortcutFilters: Partial<PropertySearchParams>) => {
    const searchParams = buildSearchParams({
      transaction,
      page: 1,
      pageSize: 12,
      sort: "newest",
      ...shortcutFilters,
    });
    navigate({ pathname: "/biens", search: searchParams.toString() });
  };

  const openSuggestion = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    navigate(toCanonicalPropertyPath(suggestion));
    setFocused(false);
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

    const optionCount = suggestions.length + 1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % optionCount);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current <= 0 ? optionCount - 1 : current - 1));
      return;
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      if (activeSuggestionIndex < suggestions.length) {
        openSuggestion(activeSuggestionIndex);
      } else {
        navigateToResults();
      }
    }
  };

  const activeOptionId = activeSuggestionIndex < 0
    ? undefined
    : activeSuggestionIndex < suggestions.length
      ? `main-search-suggestion-${suggestions[activeSuggestionIndex]?.id}`
      : "main-search-browse-option";

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
              <span className="rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm">
                Acheter
              </span>
            </div>

            <div className="relative flex min-w-0 flex-1 items-center gap-3 px-2 sm:pl-4">
              <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-strong" />
              <label htmlFor="main-property-search" className="sr-only">
                Ville, quartier, type de bien ou référence
              </label>
              <input
                id="main-property-search"
                name="q"
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="main-search-suggestions"
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
                onBlur={() => window.setTimeout(() => setFocused(false), 120)}
                onKeyDown={handleInputKeyDown}
                placeholder=""
                autoComplete="off"
                className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 sm:h-14"
              />
              {!query && !focused && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-10 right-2 top-1/2 -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap text-base text-muted-foreground sm:left-14"
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

            <Button type="submit" variant="brand" size="lg" className="h-12 w-12 shrink-0 gap-2 rounded-full px-0 sm:h-14 sm:w-auto sm:px-6">
              <span className="sr-only sm:not-sr-only">Rechercher</span>
              <Search aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {showSuggestions && (
          <AnimatePresence>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -5 }}
              transition={{ duration: reducedMotion ? 0 : 0.16, ease: "easeOut" }}
              className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-xl"
            >
              <div id="main-search-suggestions" role="listbox" aria-label="Suggestions de biens" className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
                {suggestions.length === 0 && inventoryQuery.isFetched && (
                  <p role="status" className="px-3 py-4 text-sm text-muted-foreground">
                    Aucun bien trouvé pour « {queryText} ».
                  </p>
                )}
                {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      id={`main-search-suggestion-${suggestion.id}`}
                      type="button"
                      role="option"
                      aria-selected={activeSuggestionIndex === index}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => openSuggestion(index)}
                      className={`grid w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/70 ${
                        activeSuggestionIndex === index ? "bg-muted/70" : ""
                      }`}
                    >
                      {suggestion.coverImageUrl ? (
                        <img
                          src={suggestion.coverImageUrl}
                          alt=""
                          className="h-11 w-14 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span aria-hidden="true" className="h-11 w-14 rounded-lg bg-muted" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{suggestion.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {suggestion.city.name} · {formatPropertyTypeLabel(suggestion.type)}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-right text-sm font-semibold">
                        {formatPrice(suggestion.priceAmount, suggestion.transaction)}
                      </span>
                    </button>
                ))}

                <button
                  id="main-search-browse-option"
                  type="button"
                  role="option"
                  aria-selected={activeSuggestionIndex === suggestions.length}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={navigateToResults}
                  className={`mt-1 flex w-full items-center gap-2 rounded-xl border-t border-border px-3 py-3 text-left text-sm text-brand-strong transition-colors hover:bg-brand-soft/60 ${
                    activeSuggestionIndex === suggestions.length ? "bg-brand-soft/60" : ""
                  }`}
                >
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="truncate">Voir tous les résultats pour « {queryText} »</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/80">
          Explorer par critère
        </p>
        <div role="group" aria-label="Raccourcis de recherche" className="flex gap-2 overflow-x-auto pb-1">
          {searchShortcuts.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              onClick={() => navigateToShortcut(shortcut.filters)}
              className="shrink-0 rounded-full border border-white/35 bg-slate-950/20 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:border-white/70 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/20"
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setSearchDrawerOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 rounded text-sm text-white/90 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Plus de critères
      </button>
    </div>
  );
}
