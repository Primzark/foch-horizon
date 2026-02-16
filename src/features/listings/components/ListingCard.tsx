import { Heart, MapPin, Maximize, BedDouble, Bath, Car } from "lucide-react";
import { Link } from "react-router-dom";
import type { PropertySearchItem } from "@/types/api";
import { cn } from "@/lib/utils";
import DpeBadge from "@/components/property/DpeBadge";
import {
  formatPrice,
  formatPropertyTypeLabel,
  getPropertyStatusLabel,
  toCanonicalPropertyPath,
} from "@/features/listings/utils/formatting";
import { useFavoritesStore } from "@/features/favorites/useFavoritesStore";

interface ListingCardProps {
  item: PropertySearchItem;
  viewMode?: "grid" | "list";
}

export function ListingCard({ item, viewMode = "grid" }: ListingCardProps) {
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const isFavorite = useFavoritesStore((state) => state.isFavorite(item.id));

  const path = toCanonicalPropertyPath({ id: item.id, slug: item.slug });
  const status = getPropertyStatusLabel(item.status);
  const propertyTypeLabel = formatPropertyTypeLabel(item.type);

  if (viewMode === "list") {
    return (
      <article className="overflow-hidden rounded-2xl border border-border bg-card">
        <Link to={path} className="group grid gap-4 p-3 md:grid-cols-[280px_1fr] md:p-4">
          <div className="relative overflow-hidden rounded-xl">
            <img src={item.coverImageUrl} alt={item.title} className="aspect-[4/3] h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
            {status && <span className="absolute left-2 top-2 rounded-full bg-background/95 px-2 py-1 text-xs font-medium">{status}</span>}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <p>Réf {item.id}</p>
              <span className="rounded-full border border-border px-2 py-0.5 normal-case tracking-normal text-foreground/85">
                {propertyTypeLabel}
              </span>
            </div>
            <h3 className="mt-1 font-display text-xl">{item.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {item.city.name} ({item.city.postalCode})
            </p>

            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Maximize className="h-4 w-4" /> {item.surfaceM2} m²
              </span>
              <span className="inline-flex items-center gap-1">
                <BedDouble className="h-4 w-4" /> {item.bedrooms ?? "-"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Bath className="h-4 w-4" /> {item.bathrooms ?? "-"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Car className="h-4 w-4" /> {item.garage ?? 0}
              </span>
              {item.dpeLabel && <DpeBadge label={item.dpeLabel} size="sm" />}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="font-display text-2xl">{formatPrice(item.priceAmount, item.transaction)}</p>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"
                onClick={(event) => {
                  event.preventDefault();
                  toggleFavorite(item.id);
                }}
              >
                <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                Sauvegarder
              </button>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5">
      <Link to={path} className="relative block overflow-hidden">
        <img src={item.coverImageUrl} alt={item.title} className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-80" />
        {status && <span className="absolute left-3 top-3 rounded-full bg-background/95 px-2 py-1 text-xs font-medium">{status}</span>}
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full bg-background/90 p-2"
          onClick={(event) => {
            event.preventDefault();
            toggleFavorite(item.id);
          }}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </button>
      </Link>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <p>Réf {item.id}</p>
          <span className="rounded-full border border-border px-2 py-0.5 normal-case tracking-normal text-foreground/85">
            {propertyTypeLabel}
          </span>
        </div>
        <div>
          <h3 className="font-display text-xl">{item.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {item.city.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Maximize className="h-3.5 w-3.5" /> {item.surfaceM2} m²
          </span>
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" /> {item.bedrooms ?? "-"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" /> {item.bathrooms ?? "-"}
          </span>
          {item.dpeLabel && <DpeBadge label={item.dpeLabel} size="sm" />}
        </div>
        <p className="font-display text-2xl">{formatPrice(item.priceAmount, item.transaction)}</p>
      </div>
    </article>
  );
}
