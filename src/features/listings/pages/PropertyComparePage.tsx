import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ArrowLeft, ArrowLeftRight, Building2, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getPropertyById } from "@/features/listings/api/properties.service";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";
import { formatPrice, formatPropertyTypeLabel, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { cityById } from "@/features/cities/data/cities";
import { PROPERTY_COMPARE_LIMIT, usePropertyCompareStore } from "@/features/listings/state/usePropertyCompareStore";
import { useSeo } from "@/lib/seo/useSeo";
import { trackEvent } from "@/lib/analytics/events";
import type { Property } from "@/types/domain";

interface CompareRow {
  label: string;
  values: Array<string | null>;
}

function formatCount(value: number | null, singular: string, plural = `${singular}s`): string | null {
  if (value == null) return null;
  return `${value} ${value === 1 ? singular : plural}`;
}

function exteriorFeatures(property: Property): string | null {
  const labels = [...new Set(
    property.features
      .map(({ labelFr }) => labelFr.trim())
      .filter((label) => /jardin|balcon|terrasse|cour|patio|extérieur/i.test(label)),
  )];
  return labels.length > 0 ? labels.join(" · ") : null;
}

function ComparisonPhoto({ property }: { property: Property }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const sourceUrl = property.images[0]?.sourceUrl.trim();

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
      {sourceUrl && (
        <img
          src={getPropertyImageUrl(sourceUrl, 400)}
          srcSet={getPropertyImageSrcSet(sourceUrl, [400, 800])}
          sizes="250px"
          alt={property.title}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${isLoaded && !hasError ? "opacity-100" : "opacity-0"}`}
          loading="eager"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
      {(!isLoaded || hasError || !sourceUrl) && (
        <span
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground"
          role="img"
          aria-label={hasError || !sourceUrl ? "Photo non disponible" : "Chargement de la photo"}
        >
          <Building2 className="h-7 w-7" aria-hidden="true" />
          <span className="text-[10px]">{hasError || !sourceUrl ? "Photo non disponible" : "Chargement de la photo"}</span>
        </span>
      )}
    </div>
  );
}

function getCompareRows(properties: Property[]): CompareRow[] {
  return [
    { label: "Prix", values: properties.map((property) => formatPrice(property.priceAmount, property.transactionType)) },
    { label: "Type", values: properties.map((property) => formatPropertyTypeLabel(property.propertyType)) },
    {
      label: "Ville",
      values: properties.map((property) => {
        const cityName = cityById.get(property.cityId)?.name;
        return cityName ? `${cityName} (${property.postalCode})` : property.postalCode || null;
      }),
    },
    { label: "Surface habitable", values: properties.map((property) => `${property.surfaceM2} m²`) },
    { label: "Terrain", values: properties.map((property) => property.terrainM2 == null ? null : `${property.terrainM2} m²`) },
    { label: "Pièces", values: properties.map((property) => formatCount(property.rooms, "pièce", "pièces")) },
    { label: "Chambres", values: properties.map((property) => formatCount(property.bedrooms, "chambre", "chambres")) },
    { label: "Salles de bain", values: properties.map((property) => formatCount(property.bathrooms, "salle de bain", "salles de bain")) },
    {
      label: "Stationnement",
      values: properties.map((property) => property.parkingCount == null
        ? null
        : property.parkingCount === 0 ? "Aucune place" : formatCount(property.parkingCount, "place", "places")),
    },
    {
      label: "Garage",
      values: properties.map((property) => property.garageCount == null
        ? null
        : property.garageCount === 0 ? "Aucun" : formatCount(property.garageCount, "garage", "garages")),
    },
    {
      label: "DPE",
      values: properties.map((property) => property.dpeLabel
        ? `${property.dpeLabel}${property.dpeValue != null ? ` · ${property.dpeValue} kWh/m²/an` : ""}`
        : null),
    },
    {
      label: "GES",
      values: properties.map((property) => property.gesLabel
        ? `${property.gesLabel}${property.gesValue != null ? ` · ${property.gesValue} kg CO₂/m²/an` : ""}`
        : null),
    },
    { label: "Extérieurs renseignés", values: properties.map(exteriorFeatures) },
  ];
}

export default function PropertyComparePage() {
  const ids = usePropertyCompareStore((state) => state.ids);
  const remove = usePropertyCompareStore((state) => state.remove);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const hasTrackedOpen = useRef(false);

  useEffect(() => {
    if (hasTrackedOpen.current) return;
    hasTrackedOpen.current = true;
    trackEvent("comparison_open", {
      selected_count: ids.length,
      property_ids: ids.join(","),
      source: "comparison_page",
    });
  }, [ids.length]);

  const handleRemove = (propertyId: number, placement: string) => {
    trackEvent("comparison_remove", { property_id: propertyId, source: placement });
    remove(propertyId);
  };

  const propertyQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["property-compare", id],
      queryFn: () => getPropertyById(id),
      staleTime: 30_000,
    })),
  });

  const isLoading = propertyQueries.some((query) => query.isPending);
  const resolved = ids.map((id, index) => ({ id, property: propertyQueries[index]?.data ?? null }));
  const unavailable = resolved.filter(({ property }) => !property || property.status !== "active" || property.transactionType !== "vente");
  const properties = resolved.flatMap(({ property }) =>
    property?.status === "active" && property.transactionType === "vente" ? [property] : [],
  );
  const rows = useMemo(() => getCompareRows(properties), [properties]);
  const visibleRows = showOnlyDifferences
    ? rows.filter(({ values }) => new Set(values.filter((value): value is string => value != null)).size > 1)
    : rows;

  useSeo({
    title: "Comparer des biens immobiliers – Foch Immobilier",
    description: "Comparez les caractéristiques des biens sélectionnés par Foch Immobilier.",
    canonicalPath: "/biens/comparer",
    noIndex: true,
  });

  if (isLoading) {
    return (
      <section className="container mx-auto min-h-[60vh] px-4 py-10" aria-busy="true" aria-label="Chargement de la comparaison">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded bg-muted" />
        <div className="mt-8 h-72 animate-pulse rounded-2xl bg-muted" />
        <span className="sr-only">Chargement des biens sélectionnés…</span>
      </section>
    );
  }

  if (ids.length === 0) {
    return (
      <section className="container mx-auto min-h-[60vh] px-4 py-10 sm:py-14">
        <Link to="/biens" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour aux biens
        </Link>
        <div className="mx-auto flex max-w-xl flex-col items-center py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand-strong" aria-hidden="true">
            <Building2 className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-display text-3xl">Votre comparaison est vide</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Choisissez jusqu’à trois annonces dans la liste pour comparer leurs caractéristiques côte à côte.</p>
          <Button asChild variant="brand" className="mt-6 rounded-full">
            <Link to="/biens">Parcourir les biens</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto min-h-[60vh] px-4 py-8 pb-16 sm:py-12">
      <Link to="/biens" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour aux biens
      </Link>
      <div className="mt-4 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Votre sélection · {properties.length}/{PROPERTY_COMPARE_LIMIT}</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Comparer les biens</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Les informations manquantes sont indiquées comme non renseignées.</p>
        </div>
        {properties.length >= 2 && (
          <label htmlFor="show-only-differences" className="inline-flex min-h-10 cursor-pointer items-center gap-3 self-start rounded-full border border-border bg-card px-3.5 text-sm sm:self-auto">
            <span>Afficher uniquement les différences</span>
            <Switch
              id="show-only-differences"
              checked={showOnlyDifferences}
              onCheckedChange={(enabled) => {
                setShowOnlyDifferences(enabled);
                trackEvent("comparison_differences_toggle", {
                  enabled,
                  selected_count: properties.length,
                  property_ids: properties.map((property) => property.id).join(","),
                });
              }}
            />
          </label>
        )}
      </div>

      {unavailable.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            {unavailable.length === 1 ? "Une annonce sélectionnée n’est plus disponible." : `${unavailable.length} annonces sélectionnées ne sont plus disponibles.`}
            <span className="ml-1">Retirez-les pour libérer une place.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {unavailable.map(({ id }) => (
              <Button key={id} type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => handleRemove(id, "unavailable_notice")}>
                Retirer réf. {id} <X className="ml-1 h-3.5 w-3.5" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {properties.length < 2 ? (
        <div className="mt-8 rounded-2xl border border-border bg-card px-5 py-8 text-center sm:px-8">
          <p className="font-display text-xl">Ajoutez au moins un autre bien</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">La comparaison commence dès que deux annonces actives sont sélectionnées.</p>
          {properties.map((property) => (
            <div key={property.id} className="mx-auto mt-5 flex max-w-lg items-center gap-3 rounded-xl border border-border p-2 text-left">
              {property.images[0]?.sourceUrl ? (
                <img src={getPropertyImageUrl(property.images[0].sourceUrl, 200)} srcSet={getPropertyImageSrcSet(property.images[0].sourceUrl, [200, 400])} sizes="64px" alt="" className="h-14 w-20 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-20 items-center justify-center rounded-lg bg-muted"><Building2 className="h-5 w-5 text-muted-foreground" /></span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{property.title}</p>
                <p className="text-sm text-muted-foreground">{formatPrice(property.priceAmount, property.transactionType)}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" aria-label={`Retirer le bien ${property.id}`} onClick={() => handleRemove(property.id, "single_property_summary")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button asChild variant="brand" className="mt-6 rounded-full">
            <Link to="/biens">Choisir un autre bien</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground sm:hidden">
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" /> Faites glisser le tableau pour voir les autres biens.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm" role="region" aria-label="Tableau de comparaison des biens" tabIndex={0}>
            <table className="w-full min-w-[680px] border-collapse text-left sm:min-w-[760px]">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="sticky left-0 z-20 w-36 min-w-36 bg-card p-3 align-top sm:w-48 sm:min-w-48" />
                  {properties.map((property) => {
                    const cityName = cityById.get(property.cityId)?.name;
                    return (
                      <th scope="col" key={property.id} className="w-[220px] min-w-[220px] p-3 align-top sm:w-[250px] sm:min-w-[250px]">
                        <div className="relative">
                          <ComparisonPhoto property={property} />
                          <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-sm" aria-label={`Retirer ${property.title} de la comparaison`} onClick={() => handleRemove(property.id, "comparison_table")}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Réf. {property.id} · {cityName ?? property.postalCode}</p>
                        <Link
                          to={toCanonicalPropertyPath(property)}
                          state={{ comparisonOrigin: true }}
                          onClick={() => trackEvent("comparison_listing_click", { property_id: property.id, placement: "comparison_title" })}
                          className="mt-1 line-clamp-2 block font-display text-lg leading-snug text-foreground transition-colors hover:text-brand-strong"
                        >
                          {property.title}
                        </Link>
                        <p className="mt-1 text-sm font-semibold text-brand-strong">{formatPrice(property.priceAmount, property.transactionType)}</p>
                        <Link
                          to={toCanonicalPropertyPath(property)}
                          state={{ comparisonOrigin: true }}
                          onClick={() => trackEvent("comparison_listing_click", { property_id: property.id, placement: "comparison_link" })}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground underline decoration-brand/40 underline-offset-4 hover:text-brand-strong"
                        >
                          Voir l’annonce <span aria-hidden="true">→</span>
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const known = row.values.filter((value): value is string => value != null);
                  const hasDifference = new Set(known).size > 1;
                  const frequencies = new Map<string, number>();
                  known.forEach((value) => frequencies.set(value, (frequencies.get(value) ?? 0) + 1));
                  const mostCommonCount = Math.max(0, ...frequencies.values());
                  return (
                    <tr key={row.label} className="border-b border-border last:border-0">
                      <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-3 text-xs font-medium text-muted-foreground sm:px-4 sm:text-sm">
                        <span className="flex items-center gap-1.5">
                          {row.label}
                          {hasDifference && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-label="Différence" />}
                        </span>
                      </th>
                      {row.values.map((value, index) => (
                        <td
                          key={`${row.label}-${properties[index]?.id ?? index}`}
                          className={`px-3 py-3 text-sm sm:px-4 ${value != null && hasDifference && (mostCommonCount === 1 || frequencies.get(value) !== mostCommonCount) ? "bg-brand-soft/45 font-medium text-brand-strong" : "text-foreground"}`}
                        >
                          {value ?? <span className="text-muted-foreground">Non renseigné</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {showOnlyDifferences && visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={properties.length + 1} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Aucune différence renseignée entre ces annonces.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-brand-strong" aria-hidden="true" /> Les informations affichées proviennent des annonces disponibles au moment de la consultation.
          </p>
        </div>
      )}
    </section>
  );
}
