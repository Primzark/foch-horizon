import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchThinkingState } from "@/features/content/components/SearchThinkingState";
import { geographyGuideOptions } from "@/features/content/data/geographyGuideOptions";
import { searchProperties } from "@/features/listings/api/properties.service";
import { propertyTypeOptions } from "@/features/listings/data/options";
import { buildSearchParams } from "@/features/listings/utils/query";
import { formatPrice, formatPropertyTypeLabel, toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import type { PropertySearchParams } from "@/types/api";
import type { PropertyType } from "@/types/domain";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";

export function BudgetFinder() {
  const location = useLocation();
  const [budgetText, setBudgetText] = useState("350000");
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [areaId, setAreaId] = useState("");
  const [settledBudget, setSettledBudget] = useState<number | null>(350000);

  const transaction = "vente" as const;
  const parsedBudget = budgetText.trim() ? Number(budgetText) : Number.NaN;
  const hasValidBudget = Number.isFinite(parsedBudget) && parsedBudget > 0;
  const isBudgetSettled = hasValidBudget && parsedBudget === settledBudget;
  const selectedArea = geographyGuideOptions.find((area) => area.id === areaId);
  const selectedTypeLabel = propertyTypeOptions.find((option) => option.value === propertyType)?.label;
  const havreAreas = geographyGuideOptions.filter((area) => area.city === "le-havre");
  const otherAreas = geographyGuideOptions.filter((area) => area.city !== "le-havre");
  const formattedBudget = hasValidBudget
    ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(parsedBudget)
    : null;
  const searchDetails = [
    `Type : ${selectedTypeLabel ?? "Tous les types"}`,
    `Secteur : ${selectedArea?.name ?? "Tous les secteurs"}`,
    formattedBudget ? `Budget max. : ${formattedBudget} €` : null,
  ].filter(Boolean).join(" · ");

  useEffect(() => {
    const nextBudget = hasValidBudget ? parsedBudget : null;
    const timer = window.setTimeout(() => setSettledBudget(nextBudget), 300);
    return () => window.clearTimeout(timer);
  }, [hasValidBudget, parsedBudget]);

  const filters = useMemo<PropertySearchParams>(
    () => ({
      transaction,
      priceMax: settledBudget ?? 0,
      type: propertyType || undefined,
      city: selectedArea?.city,
      q: selectedArea?.query,
      page: 1,
      pageSize: 48,
      sort: "price_asc",
    }),
    [propertyType, selectedArea, settledBudget, transaction],
  );

  const listingsQuery = useQuery({
    queryKey: ["budget-finder", filters],
    queryFn: async () => {
      const firstPage = await searchProperties(filters);
      const pageCount = Math.ceil(firstPage.total / firstPage.pageSize);
      if (pageCount <= 1) return firstPage;

      const additionalPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) =>
          searchProperties({ ...filters, page: index + 2 }),
        ),
      );

      return {
        ...firstPage,
        items: [...firstPage.items, ...additionalPages.flatMap((page) => page.items)],
      };
    },
    enabled: isBudgetSettled,
    staleTime: 1000 * 30,
  });

  const resultsHref = `/biens?${buildSearchParams(filters).toString()}`;
  const withoutAreaHref = `/biens?${buildSearchParams({ ...filters, city: undefined, q: undefined }).toString()}`;
  const withoutTypeHref = `/biens?${buildSearchParams({ ...filters, type: undefined }).toString()}`;
  const resultItems = listingsQuery.data?.items ?? [];
  const isWaitingForBudget = hasValidBudget && !isBudgetSettled;
  const isSearching = isWaitingForBudget || listingsQuery.isFetching;

  return (
    <section className="border-y border-border bg-muted/25" aria-labelledby="budget-finder-title">
      <div className="container mx-auto grid grid-cols-1 gap-9 px-4 py-12 md:py-14 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-strong">Explorer par budget</p>
          <h2 id="budget-finder-title" className="mt-2 max-w-md font-display text-3xl md:text-4xl">
            Que peut-on acheter avec votre budget ?
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Parcourez les annonces actuellement publiées et affinez selon votre projet.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="budget-finder-amount" className="text-sm font-medium">Budget maximal</label>
              <div className="relative">
                <Input
                  id="budget-finder-amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step={5000}
                  value={budgetText}
                  onChange={(event) => setBudgetText(event.target.value)}
                  aria-describedby="budget-finder-hint"
                  className="pr-28 text-base tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  €
                </span>
              </div>
              <p id="budget-finder-hint" className="text-xs text-muted-foreground">
                Prix d’achat maximum
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="budget-finder-type" className="text-sm font-medium">Type de bien</label>
              <select
                id="budget-finder-type"
                value={propertyType}
                onChange={(event) => setPropertyType(event.target.value as PropertyType | "")}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Tous les types</option>
                {propertyTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="budget-finder-city" className="text-sm font-medium">Secteur</label>
              <select
                id="budget-finder-city"
                value={areaId}
                onChange={(event) => setAreaId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Tous les secteurs</option>
                <optgroup label="Le Havre et ses quartiers">
                  {havreAreas.map((guide) => (
                    <option key={guide.id} value={guide.id}>{guide.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Autres communes et secteurs">
                  {otherAreas.map((guide) => (
                    <option key={guide.id} value={guide.id}>{guide.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:border-l lg:border-border lg:pl-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Votre sélection</p>
              <h3 className="mt-1 font-display text-2xl">
                {!hasValidBudget
                  ? "Saisissez votre budget"
                  : isSearching
                    ? "Recherche des annonces…"
                    : listingsQuery.isError
                      ? "Annonces momentanément indisponibles"
                      : `${listingsQuery.data?.total ?? 0} bien${listingsQuery.data?.total === 1 ? "" : "s"} ${selectedArea || propertyType ? "correspondant à vos critères" : "dans votre budget"}`}
              </h3>
              <div aria-label="Critères de recherche" className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <span className="rounded-full border border-border bg-background px-2 py-1">{selectedTypeLabel ?? "Tous les types"}</span>
                <span className="rounded-full border border-border bg-background px-2 py-1">{selectedArea?.name ?? "Tous les secteurs"}</span>
                {formattedBudget && (
                  <span className="rounded-full border border-border bg-background px-2 py-1">Jusqu’à {formattedBudget} €</span>
                )}
              </div>
            </div>
            {hasValidBudget && listingsQuery.data && listingsQuery.data.total > 0 && (
              <>
                <Dialog open={isResultsDialogOpen} onOpenChange={setIsResultsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="brand" size="sm" className="lg:hidden">
                      Voir les biens <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bottom-0 left-0 top-auto flex h-[min(88dvh,48rem)] max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-0 sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:h-[min(80vh,48rem)] sm:max-h-[80vh] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl sm:border">
                    <DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-14 text-left">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Votre sélection</p>
                      <DialogTitle className="font-display text-2xl font-normal leading-tight">
                        {listingsQuery.data.total} bien{listingsQuery.data.total === 1 ? "" : "s"} correspondant à vos critères
                      </DialogTitle>
                      <DialogDescription>
                        {selectedTypeLabel ?? "Tous les types"} · {selectedArea?.name ?? "Tous les secteurs"}
                        {formattedBudget ? ` · Jusqu’à ${formattedBudget} €` : ""}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
                      <div className="divide-y divide-border">
                        {resultItems.map((item) => (
                          <Link
                            key={item.id}
                            to={toCanonicalPropertyPath({ id: item.id, slug: item.slug })}
                            state={{ propertyPreview: item, propertyModal: true, backgroundLocation: location }}
                            onClick={() => setIsResultsDialogOpen(false)}
                            className="group flex min-h-[76px] items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {item.coverImageUrl ? (
                              <img
                                src={getPropertyImageUrl(item.coverImageUrl, 200)}
                                srcSet={getPropertyImageSrcSet(item.coverImageUrl, [200, 400])}
                                sizes="80px"
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-12 w-16 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong" aria-hidden="true">
                                <MapPin className="h-5 w-5" />
                              </div>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium group-hover:text-brand-strong">{item.title}</span>
                              <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                                {item.city.name} · {formatPropertyTypeLabel(item.type)} · {item.surfaceM2} m²
                              </span>
                            </span>
                            <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-brand-strong">
                              {formatPrice(item.priceAmount, item.transaction)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 border-t border-border bg-background px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                      <Button variant="brand" className="w-full" asChild>
                        <Link to={resultsHref}>
                          Afficher tous les biens <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="brand" size="sm" className="hidden lg:inline-flex" asChild>
                  <Link to={resultsHref}>
                    Voir les biens <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="mt-2" aria-busy={isSearching}>
            {!hasValidBudget ? (
              <p className="py-7 text-sm text-muted-foreground">Entrez un montant supérieur à zéro pour afficher les annonces correspondantes.</p>
            ) : isSearching ? (
              <div className="py-3">
                <SearchThinkingState className="max-w-full" details={searchDetails} />
              </div>
            ) : listingsQuery.isError ? (
              <div className="py-6">
                <p className="text-sm text-muted-foreground">Vous pouvez consulter les annonces et reprendre votre recherche.</p>
                <Link to={resultsHref} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-strong underline-offset-4 hover:underline">
                  Ouvrir la recherche <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            ) : listingsQuery.data?.total === 0 ? (
              <div className="py-6">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {selectedArea || propertyType
                    ? "Aucun bien ne correspond à ces sélections pour le moment. Élargissez le secteur ou le type de bien."
                    : "Aucun bien publié ne correspond actuellement à ce budget."}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  {selectedArea && (
                    <Link to={withoutAreaHref} className="inline-flex items-center gap-1 text-sm font-medium text-brand-strong underline-offset-4 hover:underline">
                      Inclure les autres secteurs <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  )}
                  {propertyType && (
                    <Link to={withoutTypeHref} className="inline-flex items-center gap-1 text-sm font-medium text-brand-strong underline-offset-4 hover:underline">
                      Inclure les autres types <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  )}
                  {!selectedArea && !propertyType && <span className="text-sm text-muted-foreground">Essayez un autre montant.</span>}
                </div>
              </div>
            ) : (
              <div
                role="region"
                aria-label="Annonces correspondant à votre budget"
                tabIndex={0}
                className="pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:max-h-[min(65vh,28rem)] lg:overflow-y-auto lg:overscroll-contain"
              >
                <div className="divide-y divide-border">
                  {resultItems.map((item, index) => (
                    <Link
                      key={item.id}
                      to={toCanonicalPropertyPath({ id: item.id, slug: item.slug })}
                      state={{ propertyPreview: item, propertyModal: true, backgroundLocation: location }}
                      onClick={() => setIsResultsDialogOpen(false)}
                      className={`group flex min-h-[72px] items-center gap-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-[88px] lg:gap-4 lg:py-3 ${index >= 3 ? "hidden lg:flex" : ""}`}
                    >
                      {item.coverImageUrl ? (
                        <img
                          src={getPropertyImageUrl(item.coverImageUrl, 200)}
                          srcSet={getPropertyImageSrcSet(item.coverImageUrl, [200, 400])}
                          sizes="80px"
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-12 w-16 shrink-0 rounded-lg object-cover lg:h-16 lg:w-20"
                        />
                      ) : (
                        <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong lg:h-16 lg:w-20" aria-hidden="true">
                          <MapPin className="h-5 w-5" />
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium group-hover:text-brand-strong lg:text-base">{item.title}</span>
                        <span className="mt-1 block truncate text-[11px] text-muted-foreground lg:text-xs">
                          {item.city.name} · {formatPropertyTypeLabel(item.type)} · {item.surfaceM2} m²
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-brand-strong lg:text-sm">
                        {formatPrice(item.priceAmount, item.transaction)}
                      </span>
                    </Link>
                  ))}
                  {resultItems.length > 3 && (
                    <p className="py-2 text-xs text-muted-foreground lg:hidden">Aperçu des 3 premières annonces.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
