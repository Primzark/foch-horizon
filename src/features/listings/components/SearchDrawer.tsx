import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cities } from "@/features/cities/data/cities";
import { propertyById } from "@/features/listings/data/properties";
import { featureOptions, propertyTypeOptions, transactionOptions } from "@/features/listings/data/options";
import { parseReferenceFromQuery, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { buildSearchParams, parseSearchParams } from "@/features/listings/utils/query";
import type { PropertySearchParams } from "@/types/api";
import { useUiStore } from "@/lib/state/useUiStore";
import { trackEvent } from "@/lib/analytics/events";

const defaultFilters: PropertySearchParams = {
  page: 1,
  pageSize: 12,
  sort: "newest",
};

function normalizeFilters(filters: PropertySearchParams): PropertySearchParams {
  return {
    ...defaultFilters,
    ...filters,
    page: 1,
  };
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
    const parsed = parseSearchParams(new URLSearchParams(location.search));
    setDraft({ ...defaultFilters, ...parsed });
  }, [location.search]);

  const pushFilters = useCallback((next: PropertySearchParams) => {
    const normalized = normalizeFilters(next);

    const reference = parseReferenceFromQuery(normalized.q ?? "");
    if (reference) {
      const property = propertyById.get(reference);
      if (property) {
        navigate(toCanonicalPropertyPath(property), { replace: false });
        setSearchDrawerOpen(false);
        trackEvent("filter_applied", { reference });
        return;
      }
    }

    const searchParams = buildSearchParams(normalized);
    navigate({ pathname: "/biens", search: searchParams.toString() }, { replace: false });
    trackEvent("filter_applied", normalized as Record<string, unknown>);
  }, [navigate, setSearchDrawerOpen]);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    if (!searchDrawerOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      pushFilters(draft);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [draft, isMobile, pushFilters, searchDrawerOpen]);

  const selectedFeatures = useMemo(() => new Set(draft.features ?? []), [draft.features]);

  return (
    <Sheet open={searchDrawerOpen} onOpenChange={setSearchDrawerOpen}>
      <SheetContent
        side={isMobile ? "bottom" : "top"}
        className="max-h-[92vh] overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8"
      >
        <SheetHeader className="pb-4">
          <SheetTitle>Rechercher un bien</SheetTitle>
          <SheetDescription>
            Filtrez par transaction, type, ville et critères avancés. L'URL est mise à jour pour des liens partageables.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Transaction</Label>
            <Select
              value={draft.transaction ?? "all"}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  transaction: value === "all" ? undefined : (value as "vente" | "location"),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes transactions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes transactions</SelectItem>
                {transactionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Type</Label>
            <Select
              value={draft.type ?? "all"}
              onValueChange={(value) => setDraft((current) => ({ ...current, type: value === "all" ? undefined : (value as PropertySearchParams["type"]) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                {propertyTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ville</Label>
            <Select
              value={draft.city ?? "all"}
              onValueChange={(value) => setDraft((current) => ({ ...current, city: value === "all" ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les villes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.slug}>
                    {city.name}
                  </SelectItem>
                ))}
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
              <Label htmlFor="priceMin">Prix min</Label>
              <Input
                id="priceMin"
                type="number"
                min={0}
                value={draft.priceMin ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, priceMin: event.target.value ? Number(event.target.value) : undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="priceMax">Prix max</Label>
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
              <Label>Caractéristiques</Label>
              <div className="mt-2 flex flex-wrap gap-4">
                {featureOptions.map((feature) => {
                  const checked = selectedFeatures.has(feature.value);
                  return (
                    <label key={feature.value} className="inline-flex items-center gap-2 text-sm">
                      <Checkbox
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
                      {feature.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          {isMobile && (
            <Button
              onClick={() => {
                pushFilters(draft);
                setSearchDrawerOpen(false);
              }}
            >
              Voir les résultats
            </Button>
          )}
          {!isMobile && (
            <Button
              variant="outline"
              onClick={() => {
                pushFilters(draft);
                setSearchDrawerOpen(false);
              }}
            >
              Fermer
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
