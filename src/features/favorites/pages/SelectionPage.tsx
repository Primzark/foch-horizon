import { useMemo } from "react";
import { Heart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFavoritesStore } from "@/features/favorites/useFavoritesStore";
import { ListingCard } from "@/features/listings/components/ListingCard";
import { propertyById } from "@/features/listings/data/properties";
import { toSearchItem } from "@/features/listings/utils/mappers";
import { useSeo } from "@/lib/seo/useSeo";

export default function SelectionPage() {
  const ids = useFavoritesStore((state) => state.ids);
  const clear = useFavoritesStore((state) => state.clear);

  const savedListings = useMemo(
    () =>
      [...ids]
        .reverse()
        .map((id) => propertyById.get(id))
        .filter((property): property is NonNullable<typeof property> => Boolean(property))
        .map((property) => toSearchItem(property)),
    [ids],
  );

  const unavailableCount = Math.max(ids.length - savedListings.length, 0);
  const unavailableVerb = unavailableCount > 1 ? "ne sont plus disponibles" : "n'est plus disponible";

  useSeo({
    title: "My Selection | Foch Immobilier",
    description: "Retrouvez vos biens sauvegardés et reprenez votre recherche immobilière.",
    canonicalPath: "/my-selection",
    noIndex: true,
  });

  return (
    <section className="container mx-auto px-4 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-xs font-semibold tracking-[0.05em] text-brand-strong">
            <Heart className="h-4 w-4 fill-brand text-brand" />
            My Selection
          </p>
          <h1 className="mt-3 font-display text-4xl">Biens sauvegardés</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {savedListings.length} bien{savedListings.length > 1 ? "s" : ""} disponible{savedListings.length > 1 ? "s" : ""} dans
            votre sélection.
          </p>
          {unavailableCount > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {unavailableCount} bien{unavailableCount > 1 ? "s" : ""} sauvegardé{unavailableCount > 1 ? "s" : ""}{" "}
              {unavailableVerb} dans le catalogue actuel.
            </p>
          )}
        </div>

        {savedListings.length > 0 && (
          <Button
            variant="outline"
            className="border-brand-border bg-brand-soft text-brand-strong hover:bg-brand-soft/70 hover:text-brand-strong"
            onClick={clear}
          >
            <Trash2 className="h-4 w-4" />
            Vider ma sélection
          </Button>
        )}
      </header>

      <div className="mb-7 h-px w-full accent-divider" />

      {savedListings.length === 0 ? (
        <article className="rounded-2xl border border-border bg-card p-8 text-center">
          <Heart className="mx-auto h-12 w-12 text-brand" />
          <h2 className="mt-4 font-display text-3xl">Aucun bien sauvegardé</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Cliquez sur le cœur des annonces pour constituer votre sélection et y revenir à tout moment.
          </p>
          <Button variant="brand" className="mt-6" asChild>
            <Link to="/biens">Explorer les biens</Link>
          </Button>
        </article>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {savedListings.map((listing, index) => (
            <ListingCard key={listing.id} item={listing} revealIndex={index} />
          ))}
        </div>
      )}
    </section>
  );
}
