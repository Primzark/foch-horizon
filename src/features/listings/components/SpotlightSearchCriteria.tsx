import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listingLocationOptions } from "@/features/listings/data/listingLocationOptions";
import { featureOptions, propertyTypeOptions } from "@/features/listings/data/options";
import { SearchAreaValue } from "@/features/listings/components/SearchAreaValue";
import { SearchCountBadge } from "@/features/listings/components/SearchCountBadge";
import type { PropertySearchParams } from "@/types/api";

interface SpotlightSearchCriteriaProps {
  filters: PropertySearchParams;
  onChange: (updates: Partial<PropertySearchParams>) => void;
  onQueryChange: (query: string) => void;
}

const havreAreas = listingLocationOptions.filter((area) => area.city === "le-havre");
const otherAreas = listingLocationOptions.filter((area) => area.city !== "le-havre");
const numberFields: Array<{
  key: "bedroomsMin" | "bathroomsMin" | "garagesMin" | "priceMin" | "priceMax" | "surfaceMin" | "terrainMin";
  label: string;
  min?: number;
  step?: number;
}> = [
  { key: "bedroomsMin", label: "Chambres min", min: 0 },
  { key: "bathroomsMin", label: "Salles de bain min", min: 0 },
  { key: "garagesMin", label: "Garages min", min: 0 },
  { key: "priceMin", label: "Budget minimum", min: 0, step: 1000 },
  { key: "priceMax", label: "Budget maximum", min: 0, step: 1000 },
  { key: "surfaceMin", label: "Surface min (m²)", min: 0 },
  { key: "terrainMin", label: "Terrain min (m²)", min: 0 },
];

function getSelectedArea(filters: Pick<PropertySearchParams, "city" | "q">) {
  return listingLocationOptions.find((area) => area.city === filters.city && area.query === filters.q)
    ?? listingLocationOptions.find((area) => area.city === filters.city && !area.query);
}

function formatAreaAvailability(count: number): string {
  return `${count.toLocaleString("fr-FR")} bien${count > 1 ? "s" : ""}`;
}

export function SpotlightSearchCriteria({ filters, onChange, onQueryChange }: SpotlightSearchCriteriaProps) {
  const selectedArea = getSelectedArea(filters);
  const selectedFeatures = new Set(filters.features ?? []);
  const genericQuery = listingLocationOptions.some((area) => area.query === filters.q) ? undefined : filters.q;
  const areaCounts = useQuery({
    queryKey: ["geography-area-property-counts", {
      type: filters.type,
      q: genericQuery,
      bedroomsMin: filters.bedroomsMin,
      bathroomsMin: filters.bathroomsMin,
      garagesMin: filters.garagesMin,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      surfaceMin: filters.surfaceMin,
      surfaceMax: filters.surfaceMax,
      terrainMin: filters.terrainMin,
      terrainMax: filters.terrainMax,
      features: filters.features,
    }],
    queryFn: async () => {
      const { getGeographyAreaPropertyCounts } = await import("@/features/listings/api/geographyAreaCounts.service");
      return getGeographyAreaPropertyCounts(filters);
    },
    staleTime: 60_000,
  });
  const selectedAreaCount = selectedArea
    ? areaCounts.data?.byArea[selectedArea.id]
    : areaCounts.data?.all;

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

  const updateArea = (value: string) => {
    if (value === "all") {
      const hasAreaQuery = listingLocationOptions.some((area) => area.query === filters.q);
      const nextQuery = hasAreaQuery ? undefined : filters.q;
      onChange({ city: undefined, q: nextQuery });
      onQueryChange(nextQuery ?? "");
      return;
    }

    const area = listingLocationOptions.find((option) => option.id === value);
    if (!area) return;

    const hasAreaQuery = listingLocationOptions.some((option) => option.query === filters.q);
    const nextQuery = area.query ?? (hasAreaQuery ? undefined : filters.q);
    onChange({ city: area.city, q: nextQuery });
    onQueryChange(nextQuery ?? "");
  };

  return (
    <div className="space-y-5">
      <section aria-labelledby="spotlight-search-location-heading" className="space-y-3">
        <h3 id="spotlight-search-location-heading" className="text-sm font-semibold">Type et localisation</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label id="spotlight-search-type-label">Type de bien</Label>
            <Select
              value={filters.type ?? "all"}
              onValueChange={(value) => onChange({ type: value === "all" ? undefined : value as PropertySearchParams["type"] })}
            >
              <SelectTrigger aria-labelledby="spotlight-search-type-label">
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent className="z-[210]">
                <SelectItem value="all">Tous</SelectItem>
                {propertyTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label id="spotlight-search-area-label">Ville ou secteur</Label>
            <Select value={selectedArea?.id ?? "all"} onValueChange={updateArea}>
              <SelectTrigger
                aria-labelledby="spotlight-search-area-label"
                className="[&>span]:line-clamp-none [&>span]:flex-1 [&>span]:min-w-0"
              >
                <SelectValue placeholder="Tous">
                  <SearchAreaValue
                    name={selectedArea?.name ?? "Tous"}
                    count={selectedAreaCount}
                    isLoading={areaCounts.isLoading}
                  />
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[210]">
                <SelectItem value="all" className="group">
                  {renderAreaOption("Tous", areaCounts.data?.all)}
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
      </section>

      <section aria-labelledby="spotlight-search-budget-heading" className="space-y-3 border-t border-border/70 pt-4">
        <h3 id="spotlight-search-budget-heading" className="text-sm font-semibold">Budget et caractéristiques</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {numberFields.map(({ key, label, min, step }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`spotlight-search-${key}`}>{label}</Label>
              <Input
                id={`spotlight-search-${key}`}
                type="number"
                min={min}
                step={step}
                value={filters[key] ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  onChange({ [key]: value === "" ? undefined : Number(value) });
                }}
              />
            </div>
          ))}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Caractéristiques</legend>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            {featureOptions.map((feature) => (
              <label key={feature.value} className="inline-flex min-h-8 items-center gap-2 text-sm">
                <Checkbox
                  aria-label={feature.label}
                  checked={selectedFeatures.has(feature.value)}
                  onCheckedChange={(checked) => {
                    const nextFeatures = new Set(filters.features ?? []);
                    if (checked) nextFeatures.add(feature.value);
                    else nextFeatures.delete(feature.value);
                    onChange({ features: Array.from(nextFeatures) });
                  }}
                />
                <span>{feature.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>
    </div>
  );
}
