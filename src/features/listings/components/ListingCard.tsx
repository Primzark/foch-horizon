import { Heart, MapPin, Maximize, BedDouble, Bath, Car } from "lucide-react";
import { motion } from "framer-motion";
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
import { getPlaceImageMotionPreset, inferPlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { PlaceAtmosphereLayer } from "@/components/visuals/PlaceAtmosphereLayer";
import { ContextAwareParallax } from "@/components/visuals/ContextAwareParallax";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";

interface ListingCardProps {
  item: PropertySearchItem;
  viewMode?: "grid" | "list";
  revealIndex?: number;
}

export function ListingCard({ item, viewMode = "grid", revealIndex = 0 }: ListingCardProps) {
  const toggleFavorite = useFavoritesStore((state) => state.toggle);
  const isFavorite = useFavoritesStore((state) => state.isFavorite(item.id));
  const { reducedMotion } = useMotionPreference();

  const path = toCanonicalPropertyPath({ id: item.id, slug: item.slug });
  const status = getPropertyStatusLabel(item.status);
  const propertyTypeLabel = formatPropertyTypeLabel(item.type);
  const imageMood = inferPlaceImageMood(item.city.name, item.title, propertyTypeLabel);
  const imageMotionPreset = getPlaceImageMotionPreset(imageMood);
  const motionDirector = getMotionDirectorProfile(imageMood);
  const enableAmbientAnimation = !reducedMotion && revealIndex < 4;
  const revealDelay = Math.min(revealIndex * motionDirector.revealStagger, 0.45);
  const revealProps = reducedMotion
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.05 },
        transition: { duration: motionDirector.revealDuration * 0.65, delay: revealDelay, ease: [0.22, 1, 0.36, 1] as const },
      };
  const cardHoverMotion = reducedMotion ? undefined : { y: motionDirector.cardHoverLift, scale: motionDirector.cardHoverScale };

  if (viewMode === "list") {
    return (
      <motion.article
        {...revealProps}
        whileHover={cardHoverMotion}
        className="overflow-hidden rounded-2xl border border-border bg-card"
        itemScope
        itemType="https://schema.org/RealEstateListing"
      >
        <Link to={path} className="group grid gap-4 p-3 md:grid-cols-[280px_1fr] md:p-4" itemProp="url">
          <div className="relative overflow-hidden rounded-xl">
            <ContextAwareParallax mood={imageMood} reducedMotion={reducedMotion} intensity="subtle">
              <img
                src={item.coverImageUrl}
                alt={item.title}
                className={cn(
                  "aspect-[4/3] h-full w-full object-cover transition-transform",
                  imageMotionPreset.hoverClassName,
                )}
                loading="lazy"
                itemProp="image"
              />
            </ContextAwareParallax>
            <PlaceAtmosphereLayer mood={imageMood} animated={enableAmbientAnimation} className="z-[1]" />
            <div
              className={cn(
                "pointer-events-none absolute inset-0 z-[2] bg-gradient-to-tr opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                imageMotionPreset.overlayClassName,
              )}
            />
            {status && <span className="absolute left-2 top-2 z-[3] rounded-full bg-background/95 px-2 py-1 text-xs font-medium">{status}</span>}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <p>Réf {item.id}</p>
              <span className="rounded-full border border-border px-2 py-0.5 normal-case tracking-normal text-foreground/85">
                {propertyTypeLabel}
              </span>
            </div>
            <h3 className="mt-1 font-display text-xl" itemProp="name">
              {item.title}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                <span itemProp="addressLocality">{item.city.name}</span> (<span itemProp="postalCode">{item.city.postalCode}</span>)
              </span>
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
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                  isFavorite
                    ? "border-brand-border bg-brand-soft text-brand-strong"
                    : "border-border text-foreground hover:border-brand-border hover:bg-brand-soft/60",
                )}
                onClick={(event) => {
                  event.preventDefault();
                  toggleFavorite(item.id);
                }}
              >
                <Heart className={cn("h-4 w-4", isFavorite && "fill-brand text-brand")} />
                Sauvegarder
              </button>
            </div>
          </div>
        </Link>
        <meta itemProp="identifier" content={String(item.id)} />
        <meta itemProp="floorSize" content={String(item.surfaceM2)} />
        <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
          <meta itemProp="priceCurrency" content={item.currency} />
          <meta itemProp="price" content={String(item.priceAmount)} />
          <meta itemProp="availability" content={item.status === "active" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability"} />
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      {...revealProps}
      whileHover={cardHoverMotion}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200"
      itemScope
      itemType="https://schema.org/RealEstateListing"
    >
      <Link to={path} className="relative block overflow-hidden" itemProp="url">
        <ContextAwareParallax mood={imageMood} reducedMotion={reducedMotion} intensity="subtle">
          <img
            src={item.coverImageUrl}
            alt={item.title}
            className={cn(
              "aspect-[4/3] w-full object-cover transition-transform",
              imageMotionPreset.hoverClassName,
            )}
            loading="lazy"
            itemProp="image"
          />
        </ContextAwareParallax>
        <PlaceAtmosphereLayer mood={imageMood} animated={enableAmbientAnimation} className="z-[1]" />
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t opacity-80 transition-opacity duration-500 group-hover:opacity-95",
            imageMotionPreset.overlayClassName,
          )}
        />
        {status && <span className="absolute left-3 top-3 z-[3] rounded-full bg-background/95 px-2 py-1 text-xs font-medium">{status}</span>}
        <button
          type="button"
          className={cn(
            "absolute right-3 top-3 z-[3] rounded-full p-2 transition-colors",
            isFavorite
              ? "bg-brand-soft text-brand-strong shadow-[0_8px_22px_hsl(var(--brand)/0.18)]"
              : "bg-background/90 text-foreground hover:bg-brand-soft/75",
          )}
          onClick={(event) => {
            event.preventDefault();
            toggleFavorite(item.id);
          }}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-brand text-brand")} />
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
          <h3 className="font-display text-xl" itemProp="name">
            {item.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
              <span itemProp="addressLocality">{item.city.name}</span>
            </span>
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
        <meta itemProp="identifier" content={String(item.id)} />
        <meta itemProp="floorSize" content={String(item.surfaceM2)} />
        <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
          <meta itemProp="priceCurrency" content={item.currency} />
          <meta itemProp="price" content={String(item.priceAmount)} />
          <meta itemProp="availability" content={item.status === "active" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability"} />
        </div>
      </div>
    </motion.article>
  );
}
