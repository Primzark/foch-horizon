import { ArrowRight } from "lucide-react";
import { formatPrice, formatPropertyTypeLabel } from "@/features/listings/utils/formatting";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";
import type { PropertySearchItem } from "@/types/api";

interface PropertySearchSuggestionProps {
  property: PropertySearchItem;
  idPrefix: "main-search-suggestion" | "spotlight-search-suggestion";
  isActive: boolean;
  reducedMotion: boolean;
  variant: "main" | "spotlight";
  onSelect: () => void;
}

export function PropertySearchSuggestion({
  property,
  idPrefix,
  isActive,
  reducedMotion,
  variant,
  onSelect,
}: PropertySearchSuggestionProps) {
  const isMainVariant = variant === "main";
  const imageClassName = isMainVariant ? "h-11 w-14" : "h-12 w-[3.75rem]";
  const imageSizes = isMainVariant ? "56px" : "60px";
  const gridClassName = isMainVariant
    ? "grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] gap-3 px-2 py-2"
    : "grid-cols-[3.75rem_minmax(0,1fr)_auto_auto] gap-3 px-2.5 py-2.5";

  return (
    <button
      id={`${idPrefix}-${property.id}`}
      type="button"
      role="option"
      aria-selected={isActive}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
      className={`group grid w-full items-center rounded-xl text-left text-sm ${gridClassName} ${
        reducedMotion ? "transition-none" : "transition-colors ease-out"
      } ${
        isActive
          ? "bg-brand-soft/75 text-brand-strong"
          : "hover:bg-brand-soft/65 hover:text-brand-strong focus-visible:bg-brand-soft/65 focus-visible:text-brand-strong"
      }`}
      style={{ transitionDuration: reducedMotion ? "0ms" : "160ms" }}
    >
      <span className={`block shrink-0 overflow-hidden rounded-lg bg-muted ${imageClassName}`}>
        {property.coverImageUrl ? (
          <img
            src={getPropertyImageUrl(property.coverImageUrl, 200)}
            srcSet={getPropertyImageSrcSet(property.coverImageUrl, [200, 400])}
            sizes={imageSizes}
            alt=""
            className={`h-full w-full object-cover ${
              reducedMotion ? "" : "transition-transform group-hover:scale-[1.06] group-focus-visible:scale-[1.06]"
            }`}
            style={{ transitionDuration: reducedMotion ? "0ms" : "350ms" }}
            loading="lazy"
          />
        ) : (
          <span aria-hidden="true" className="block h-full w-full" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{property.title}</span>
        <span className={`${isMainVariant ? "" : "mt-0.5"} block truncate text-xs text-muted-foreground`}>
          {property.city.name} · {formatPropertyTypeLabel(property.type)}
        </span>
      </span>
      <span className={`whitespace-nowrap text-right font-semibold ${isMainVariant ? "text-sm" : "text-sm tabular-nums"}`}>
        {formatPrice(property.priceAmount, property.transaction)}
      </span>
      <ArrowRight
        aria-hidden="true"
        className={`h-3.5 w-3.5 text-muted-foreground ${
          reducedMotion ? "" : "transition-transform ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1"
        } ${isActive ? "translate-x-1 text-brand-strong" : ""}`}
        style={{ transitionDuration: reducedMotion ? "0ms" : "160ms" }}
      />
    </button>
  );
}
