import type { FocusEventHandler, KeyboardEventHandler, ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { GeographyGuideLabel } from "@/features/content/data/geographyGuideIndex";
import { formatPrice, formatPropertyTypeLabel } from "@/features/listings/utils/formatting";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";
import type { PropertySearchItem } from "@/types/api";

const MAX_STAGGERED_SUGGESTIONS = 4;
const GUIDE_STAGGER_SECONDS = 0.035;
const PROPERTY_STAGGER_SECONDS = 0.035;

export type SearchSuggestionCategory = "all" | "properties" | "guides";

interface SearchSuggestionPanelProps {
  isVisible: boolean;
  id?: string;
  className?: string;
  onBlur?: FocusEventHandler<HTMLDivElement>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  children: ReactNode;
}

/** Stable outer dropdown; its category controls stay fixed while results update. */
export function SearchSuggestionPanel({
  isVisible,
  id,
  className,
  onBlur,
  onKeyDown,
  children,
}: SearchSuggestionPanelProps) {
  if (!isVisible) return null;

  return (
    <div id={id} className={className} onBlur={onBlur} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

interface SearchSuggestionResultsProps {
  reducedMotion: boolean;
  children: ReactNode;
}

/** Fades results in below the fixed category controls without moving their hit targets. */
export function SearchSuggestionResults({ reducedMotion, children }: SearchSuggestionResultsProps) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

interface SearchSuggestionCategorySwitchProps {
  activeCategory: SearchSuggestionCategory;
  guideCount: number;
  propertyCount: number;
  reducedMotion: boolean;
  className?: string;
  onChange: (category: SearchSuggestionCategory) => void;
}

/** Keeps each suggestion category directly accessible above the result list. */
export function SearchSuggestionCategorySwitch({
  activeCategory,
  guideCount,
  propertyCount,
  reducedMotion,
  className,
  onChange,
}: SearchSuggestionCategorySwitchProps) {
  const categories: Array<{ id: SearchSuggestionCategory; label: string; count: number }> = [
    { id: "all", label: "Tout", count: guideCount + propertyCount },
    { id: "properties", label: "Biens", count: propertyCount },
    { id: "guides", label: "Pages locales", count: guideCount },
  ];

  return (
    <div
      role="group"
      aria-label="Filtrer les suggestions par catégorie"
      className={`flex items-center gap-1 rounded-xl border border-border/70 bg-muted/45 p-1 ${className ?? ""}`}
    >
      {categories.map((category) => {
        const isActive = activeCategory === category.id;

        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={isActive}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange(category.id)}
            className={`inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-1 ${reducedMotion ? "transition-none" : "transition-colors"} ${
              isActive
                ? "bg-background text-brand-strong shadow-sm"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
            }`}
            style={{ transitionDuration: reducedMotion ? "0ms" : "160ms" }}
          >
            <span className="truncate">{category.label}</span>
            <span className="shrink-0 text-[10px] tabular-nums opacity-75">{category.count}</span>
          </button>
        );
      })}
    </div>
  );
}

interface SearchSuggestionCrossfadeProps {
  category: SearchSuggestionCategory;
  reducedMotion: boolean;
  children: ReactNode;
}

/** Crossfades the active category while keeping its listbox container stable. */
export function SearchSuggestionCrossfade({ category, reducedMotion, children }: SearchSuggestionCrossfadeProps) {
  return (
    <AnimatePresence mode="sync">
      <SearchSuggestionCrossfadeLayer key={category} reducedMotion={reducedMotion}>
        {children}
      </SearchSuggestionCrossfadeLayer>
    </AnimatePresence>
  );
}

interface SearchSuggestionCrossfadeLayerProps {
  reducedMotion: boolean;
  children: ReactNode;
}

function SearchSuggestionCrossfadeLayer({
  reducedMotion,
  children,
}: SearchSuggestionCrossfadeLayerProps) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      role="presentation"
      aria-hidden={!isPresent}
      ref={(element) => {
        if (!element) return;
        if (isPresent) element.removeAttribute("inert");
        else element.setAttribute("inert", "");
      }}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
      className="col-start-1 row-start-1 min-w-0"
      style={{ pointerEvents: isPresent ? "auto" : "none" }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedGuideSuggestionGroupProps {
  guides: GeographyGuideLabel[];
  activeIndex: number;
  idPrefix: "main-search-guide" | "spotlight-search-guide";
  reducedMotion: boolean;
  showHeading?: boolean;
  onSelect: (index: number) => void;
}

/** Renders guide-only options with a restrained entrance and shared keyboard highlight. */
export function AnimatedGuideSuggestionGroup({
  guides,
  activeIndex,
  idPrefix,
  reducedMotion,
  showHeading = true,
  onSelect,
}: AnimatedGuideSuggestionGroupProps) {
  if (guides.length === 0) return null;

  return (
    <div role="group" aria-label="Pages locales" className="space-y-0.5">
      {showHeading && (
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Pages locales
        </p>
      )}
      {guides.map((guide, index) => {
        const isActive = activeIndex === index;
        const shouldStagger = !reducedMotion && index < MAX_STAGGERED_SUGGESTIONS;

        return (
          <button
            key={guide.id}
            id={`${idPrefix}-${guide.id}`}
            type="button"
            role="option"
            aria-selected={isActive}
            data-active={isActive || undefined}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(index)}
            className={`group relative isolate flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-left text-sm transition-colors ease-out ${
              isActive
                ? "text-brand-strong"
                : "hover:bg-brand-soft/65 hover:text-brand-strong focus-visible:bg-brand-soft/65 focus-visible:text-brand-strong"
            }`}
            style={{ transitionDuration: reducedMotion ? "0ms" : "160ms" }}
          >
            {isActive && (
              <motion.span
                aria-hidden="true"
                layoutId={`${idPrefix}-active-highlight`}
                initial={false}
                transition={{ duration: reducedMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute inset-0 z-0 rounded-xl bg-brand-soft/75"
              />
            )}
            <motion.span
              initial={shouldStagger ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reducedMotion ? 0 : 0.19,
                delay: shouldStagger ? index * GUIDE_STAGGER_SECONDS : 0,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative z-10 flex w-full min-w-0 items-center justify-between gap-3"
            >
              <span className="block min-w-0 truncate font-medium">{guide.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <span>Page locale</span>
                <span
                  aria-hidden="true"
                  className={`transition-transform ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1 ${
                    isActive ? "translate-x-1 text-brand-strong" : ""
                  }`}
                  style={{ transitionDuration: reducedMotion ? "0ms" : "160ms" }}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </span>
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}

interface AnimatedPropertySuggestionGroupProps {
  properties: PropertySearchItem[];
  activeIndex: number;
  optionIndexOffset: number;
  staggerIndexOffset: number;
  idPrefix: "main-search-suggestion" | "spotlight-search-suggestion";
  reducedMotion: boolean;
  variant: "main" | "spotlight";
  showHeading?: boolean;
  onSelect: (index: number) => void;
}

/** Renders stable-key property suggestions with a staggered entrance and image hover. */
export function AnimatedPropertySuggestionGroup({
  properties,
  activeIndex,
  optionIndexOffset,
  staggerIndexOffset,
  idPrefix,
  reducedMotion,
  variant,
  showHeading = true,
  onSelect,
}: AnimatedPropertySuggestionGroupProps) {
  if (properties.length === 0) return null;

  const isMainVariant = variant === "main";
  const imageClassName = isMainVariant ? "h-11 w-14" : "h-12 w-[3.75rem]";
  const imageSizes = isMainVariant ? "56px" : "60px";
  const gridClassName = isMainVariant
    ? "grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] gap-3 px-2 py-2"
    : "grid-cols-[3.75rem_minmax(0,1fr)_auto_auto] gap-3 px-2.5 py-2.5";

  return (
    <div role="group" aria-label="Biens correspondants" className="space-y-0.5">
      {showHeading && (
        <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Biens correspondants
        </p>
      )}
      {properties.map((property, index) => {
        const optionIndex = optionIndexOffset + index;
        const isActive = activeIndex === optionIndex;
        const staggerIndex = staggerIndexOffset + index;
        const shouldStagger = !reducedMotion && staggerIndex < MAX_STAGGERED_SUGGESTIONS;
        const animationDelay = shouldStagger ? staggerIndex * PROPERTY_STAGGER_SECONDS : 0;

        return (
          <button
            key={property.id}
            id={`${idPrefix}-${property.id}`}
            type="button"
            role="option"
            aria-selected={isActive}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(optionIndex)}
            className={`group w-full rounded-xl text-left text-sm ${reducedMotion ? "transition-none" : "transition-colors ease-out"} ${
              isActive
                ? "bg-brand-soft/75 text-brand-strong"
                : "hover:bg-brand-soft/65 hover:text-brand-strong focus-visible:bg-brand-soft/65 focus-visible:text-brand-strong"
            }`}
            style={{ transitionDuration: reducedMotion ? "0ms" : "160ms" }}
          >
            <motion.span
              initial={shouldStagger ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reducedMotion ? 0 : 0.2,
                delay: reducedMotion ? 0 : animationDelay,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`grid w-full min-w-0 items-center ${gridClassName}`}
            >
              <span className={`block shrink-0 overflow-hidden rounded-lg bg-muted ${imageClassName}`}>
                {property.coverImageUrl ? (
                  <img
                    src={getPropertyImageUrl(property.coverImageUrl, 200)}
                    srcSet={getPropertyImageSrcSet(property.coverImageUrl, [200, 400])}
                    sizes={imageSizes}
                    alt=""
                    className={`h-full w-full object-cover ${
                      reducedMotion ? "" : "transition-transform group-hover:scale-[1.06]"
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
              <span
                aria-hidden="true"
                className={`text-muted-foreground ${reducedMotion ? "transition-none" : "transition-transform ease-out"} group-hover:translate-x-1 group-focus-visible:translate-x-1 ${
                  isActive ? "translate-x-1 text-brand-strong" : ""
                }`}
                style={{ transitionDuration: reducedMotion ? "0ms" : "160ms" }}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </motion.span>
          </button>
        );
      })}
    </div>
  );
}
