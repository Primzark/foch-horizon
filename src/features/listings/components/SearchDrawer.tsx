import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { listingLocationOptions } from "@/features/listings/data/listingLocationOptions";
import { featureOptions, propertyTypeOptions } from "@/features/listings/data/options";
import { parseReferenceFromQuery, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { buildSearchParams } from "@/features/listings/utils/query";
import { persistAppliedPropertySearchFilters, resolvePropertySearchFilters } from "@/features/listings/utils/searchFilterPersistence";
import { searchProperties } from "@/features/listings/api/properties.service";
import type { PropertySearchParams } from "@/types/api";
import { useUiStore } from "@/lib/state/useUiStore";
import { trackEvent } from "@/lib/analytics/events";
import { createPropertyModalRouteState } from "@/features/listings/navigation/propertyModalNavigation";
import { SearchAreaValue } from "@/features/listings/components/SearchAreaValue";
import { SearchCountBadge } from "@/features/listings/components/SearchCountBadge";

const defaultFilters: PropertySearchParams = {
  transaction: "vente",
  page: 1,
  pageSize: 12,
  sort: "newest",
};

const havreAreas = listingLocationOptions.filter((area) => area.city === "le-havre");
const otherAreas = listingLocationOptions.filter((area) => area.city !== "le-havre");

function getSelectedArea(filters: Pick<PropertySearchParams, "city" | "q">) {
  const exactMatch = listingLocationOptions.find(
    (area) => area.city === filters.city && area.query === filters.q,
  );
  if (exactMatch) return exactMatch;

  // Keep a city selected when the keyword filter is being used independently.
  return listingLocationOptions.find((area) => area.city === filters.city && !area.query);
}

function normalizeFilters(filters: PropertySearchParams): PropertySearchParams {
  return {
    ...defaultFilters,
    ...filters,
    transaction: "vente",
    page: 1,
  };
}

function formatAreaAvailability(count: number): string {
  return `${count.toLocaleString("fr-FR")} bien${count > 1 ? "s" : ""}`;
}

export function SearchDrawer() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draft, setDraft] = useState<PropertySearchParams>(defaultFilters);
  const searchDrawerOpen = useUiStore((state) => state.searchDrawerOpen);
  const setSearchDrawerOpen = useUiStore((state) => state.setSearchDrawerOpen);

  useEffect(() => {
    const parsed = resolvePropertySearchFilters(location.search);
    setDraft({ ...defaultFilters, ...parsed });
  }, [location.search]);

  const pushFilters = useCallback(async (next: PropertySearchParams) => {
    const normalized = normalizeFilters(next);
    persistAppliedPropertySearchFilters(normalized);

    const reference = parseReferenceFromQuery(normalized.q ?? "");
    if (reference) {
      const { propertyById } = await import("@/features/listings/data/properties");
      const property = propertyById.get(reference);
      if (property) {
        navigate(toCanonicalPropertyPath(property), {
          replace: false,
          state: createPropertyModalRouteState(location, toSearchItem(property)),
        });
        setSearchDrawerOpen(false);
        trackEvent("filter_applied", { reference });
        return;
      }
    }

    const searchParams = buildSearchParams(normalized);
    navigate({ pathname: "/biens", search: searchParams.toString() }, { replace: false });
    trackEvent("filter_applied", normalized as Record<string, unknown>);
  }, [location, navigate, setSearchDrawerOpen]);

  const selectedFeatures = useMemo(() => new Set(draft.features ?? []), [draft.features]);
  const selectedArea = getSelectedArea(draft);
  const genericQuery = listingLocationOptions.some((area) => area.query === draft.q) ? undefined : draft.q;
  const areaCounts = useQuery({
    queryKey: ["geography-area-property-counts", {
      type: draft.type,
      q: genericQuery,
      bedroomsMin: draft.bedroomsMin,
      bathroomsMin: draft.bathroomsMin,
      garagesMin: draft.garagesMin,
      priceMin: draft.priceMin,
      priceMax: draft.priceMax,
      surfaceMin: draft.surfaceMin,
      surfaceMax: draft.surfaceMax,
      terrainMin: draft.terrainMin,
      terrainMax: draft.terrainMax,
      features: draft.features,
    }],
    queryFn: async () => {
      const { getGeographyAreaPropertyCounts } = await import("@/features/listings/api/geographyAreaCounts.service");
      return getGeographyAreaPropertyCounts(draft);
    },
    enabled: searchDrawerOpen,
    staleTime: 60_000,
  });
  const selectedAreaCount = selectedArea
    ? areaCounts.data?.byArea[selectedArea.id]
    : areaCounts.data?.all;
  const resultCountFilters = useMemo(() => ({ ...normalizeFilters(draft), page: 1, pageSize: 1 }), [draft]);
  const resultCount = useQuery({
    queryKey: ["property-search-result-count", resultCountFilters],
    queryFn: () => searchProperties(resultCountFilters),
    enabled: searchDrawerOpen,
    staleTime: 30_000,
  });
  const resultCountValue = resultCount.data?.total;
  const resultCountLabel = resultCountValue == null
    ? resultCount.isError ? "—" : "…"
    : resultCountValue.toLocaleString("fr-FR");
  const resultCountPrefix = resultCountValue === 1 ? "Voir" : "Voir les";
  const resultCountSuffix = resultCountValue === 1 ? "résultat" : "résultats";
  const resultCountAccessibleLabel = resultCountValue == null
    ? resultCount.isError ? "Voir les résultats, disponibilité indisponible" : "Voir les résultats, calcul en cours"
    : `${resultCountPrefix} ${resultCountLabel} ${resultCountSuffix}`;

  const renderAreaOption = (name: string, count: number | undefined) => (
    <span className="flex w-full min-w-0 items-center justify-between gap-4">
      <span className="truncate">{name}</span>
      <span
        className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground group-data-[highlighted]:text-accent-foreground"
        aria-label={count == null ? (areaCounts.isLoading ? "Calcul des disponibilités" : "Disponibilités indisponibles") : formatAreaAvailability(count)}
      >
        {count == null
          ? areaCounts.isLoading
            ? <SearchCountBadge size="compact" aria-hidden="true">…</SearchCountBadge>
            : areaCounts.isError
              ? <SearchCountBadge size="compact" aria-hidden="true">—</SearchCountBadge>
              : null
          : <>
              <SearchCountBadge size="compact" aria-hidden="true">{count.toLocaleString("fr-FR")}</SearchCountBadge>
              <span aria-hidden="true">bien{count > 1 ? "s" : ""}</span>
            </>}
      </span>
    </span>
  );

  return (
    <Sheet open={searchDrawerOpen} onOpenChange={setSearchDrawerOpen}>
      <SheetContent
        side={isMobile ? "bottom" : "top"}
        className="max-h-[92vh] overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8"
      >
        <SheetHeader className="pb-4">
          <SheetTitle>Rechercher un bien</SheetTitle>
          <SheetDescription>
            Filtrez par type, ville, secteur et critères avancés. L'URL est mise à jour pour des liens partageables.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label id="listing-search-type-label">Type</Label>
            <Select
              value={draft.type ?? "all"}
              onValueChange={(value) => setDraft((current) => ({ ...current, type: value === "all" ? undefined : (value as PropertySearchParams["type"]) }))}
            >
              <SelectTrigger aria-labelledby="listing-search-type-label">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {propertyTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label id="listing-search-city-label">Ville ou secteur</Label>
            <Select
              value={selectedArea?.id ?? "all"}
              onValueChange={(value) => {
                if (value === "all") {
                  setDraft((current) => {
                    const hasAreaQuery = listingLocationOptions.some((area) => area.query === current.q);
                    return {
                      ...current,
                      city: undefined,
                      q: hasAreaQuery ? undefined : current.q,
                    };
                  });
                  return;
                }

                const area = listingLocationOptions.find((option) => option.id === value);
                if (!area) return;
                setDraft((current) => {
                  const hasAreaQuery = listingLocationOptions.some((option) => option.query === current.q);
                  return {
                    ...current,
                    city: area.city,
                    q: area.query ?? (hasAreaQuery ? undefined : current.q),
                  };
                });
              }}
            >
              <SelectTrigger
                aria-labelledby="listing-search-city-label"
                className="[&>span]:line-clamp-none [&>span]:flex-1 [&>span]:min-w-0"
              >
                <SelectValue placeholder="Tous les">
                  <SearchAreaValue
                    name={selectedArea?.name ?? "Tous les"}
                    count={selectedAreaCount}
                    isLoading={areaCounts.isLoading}
                  />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="group">
                  {renderAreaOption("Tous les", areaCounts.data?.all)}
                </SelectItem>
                <SelectGroup>
                  <SelectLabel>Le Havre et ses quartiers</SelectLabel>
                  {havreAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id} className="group">
                      {renderAreaOption(area.name, areaCounts.data?.byArea[area.id])}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Autres communes et secteurs</SelectLabel>
                  {otherAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id} className="group">
                      {renderAreaOption(area.name, areaCounts.data?.byArea[area.id])}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setAdvancedOpen((current) => !current)}
          >
            {advancedOpen ? "Masquer les filtres" : "Plus de filtres"}
          </button>

          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setDraft(defaultFilters)}
          >
            Réinitialiser
          </button>
        </div>

        {advancedOpen && (
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="q">Mot-clé / Référence</Label>
              <Input id="q" value={draft.q ?? ""} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value || undefined }))} />
            </div>
            <div>
              <Label htmlFor="bedroomsMin">Chambres min</Label>
              <Input
                id="bedroomsMin"
                type="number"
                min={0}
                value={draft.bedroomsMin ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, bedroomsMin: event.target.value ? Number(event.target.value) : undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="bathroomsMin">Salles de bain min</Label>
              <Input
                id="bathroomsMin"
                type="number"
                min={0}
                value={draft.bathroomsMin ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, bathroomsMin: event.target.value ? Number(event.target.value) : undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="garagesMin">Garages min</Label>
              <Input
                id="garagesMin"
                type="number"
                min={0}
                value={draft.garagesMin ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, garagesMin: event.target.value ? Number(event.target.value) : undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="priceMin">Budget minimum</Label>
              <Input
                id="priceMin"
                type="number"
                min={0}
                value={draft.priceMin ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, priceMin: event.target.value ? Number(event.target.value) : undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="priceMax">Budget maximum</Label>
              <Input
                id="priceMax"
                type="number"
                min={0}
                value={draft.priceMax ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, priceMax: event.target.value ? Number(event.target.value) : undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="surfaceMin">Surface min (m²)</Label>
              <Input
                id="surfaceMin"
                type="number"
                min={0}
                value={draft.surfaceMin ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, surfaceMin: event.target.value ? Number(event.target.value) : undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="terrainMin">Terrain min (m²)</Label>
              <Input
                id="terrainMin"
                type="number"
                min={0}
                value={draft.terrainMin ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, terrainMin: event.target.value ? Number(event.target.value) : undefined }))}
              />
            </div>
            <div className="md:col-span-4">
              <fieldset>
                <legend className="text-sm font-medium leading-none">Caractéristiques</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {featureOptions.map((feature) => {
                  const checked = selectedFeatures.has(feature.value);
                  return (
                    <label key={feature.value} className="inline-flex items-center gap-2 text-sm">
                      <Checkbox
                        aria-labelledby={"listing-search-feature-" + feature.value}
                        checked={checked}
                        onCheckedChange={(isChecked) => {
                          setDraft((current) => {
                            const currentFeatures = new Set(current.features ?? []);
                            if (isChecked) {
                              currentFeatures.add(feature.value);
                            } else {
                              currentFeatures.delete(feature.value);
                            }
                            return { ...current, features: Array.from(currentFeatures) };
                          });
                        }}
                      />
                      <span id={"listing-search-feature-" + feature.value}>{feature.label}</span>
                    </label>
                  );
                })}
              </div>
              </fieldset>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          {isMobile && (
            <Button
              aria-label={resultCountAccessibleLabel}
              onClick={() => {
                pushFilters(draft);
                setSearchDrawerOpen(false);
              }}
              className="gap-0"
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span>{resultCountPrefix}</span>
                <SearchCountBadge aria-live="polite">{resultCountLabel}</SearchCountBadge>
                <span>{resultCountSuffix}</span>
              </span>
            </Button>
          )}
          {!isMobile && (
            <Button
              variant="outline"
              aria-label={resultCountAccessibleLabel}
              onClick={() => {
                pushFilters(draft);
                setSearchDrawerOpen(false);
              }}
              className="gap-0"
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span>{resultCountPrefix}</span>
                <SearchCountBadge aria-live="polite">{resultCountLabel}</SearchCountBadge>
                <span>{resultCountSuffix}</span>
              </span>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
