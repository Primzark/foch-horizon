import type { PropertySearchParams } from "@/types/api";

interface ActiveFiltersChipsProps {
  filters: PropertySearchParams;
  onClear: (key: keyof PropertySearchParams) => void;
  onClearAll: () => void;
}

export function ActiveFiltersChips({ filters, onClear, onClearAll }: ActiveFiltersChipsProps) {
  const entries: Array<{ key: keyof PropertySearchParams; label: string }> = [];

  if (filters.transaction) entries.push({ key: "transaction", label: `Transaction: ${filters.transaction}` });
  if (filters.type) entries.push({ key: "type", label: `Type: ${filters.type}` });
  if (filters.city) entries.push({ key: "city", label: `Ville: ${filters.city}` });
  if (filters.q) entries.push({ key: "q", label: `Mot-clé: ${filters.q}` });
  if (filters.bedroomsMin != null) entries.push({ key: "bedroomsMin", label: `Chambres >= ${filters.bedroomsMin}` });
  if (filters.bathroomsMin != null) entries.push({ key: "bathroomsMin", label: `SDB >= ${filters.bathroomsMin}` });
  if (filters.garagesMin != null) entries.push({ key: "garagesMin", label: `Garages >= ${filters.garagesMin}` });
  if (filters.priceMin != null) entries.push({ key: "priceMin", label: `Prix min ${filters.priceMin}` });
  if (filters.priceMax != null) entries.push({ key: "priceMax", label: `Prix max ${filters.priceMax}` });
  if (filters.surfaceMin != null) entries.push({ key: "surfaceMin", label: `Surface >= ${filters.surfaceMin}m²` });
  if (filters.terrainMin != null) entries.push({ key: "terrainMin", label: `Terrain >= ${filters.terrainMin}m²` });

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      {entries.map((entry) => (
        <button
          key={`${entry.key}-${entry.label}`}
          type="button"
          className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs"
          onClick={() => onClear(entry.key)}
        >
          {entry.label} ×
        </button>
      ))}

      <button type="button" className="text-xs underline-offset-4 hover:underline" onClick={onClearAll}>
        Réinitialiser tous les filtres
      </button>
    </div>
  );
}
