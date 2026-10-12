import { useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PropertyImage } from "@/types/domain";
import { trackEvent } from "@/lib/analytics/events";
import { inferPlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { PlaceAtmosphereLayer } from "@/components/visuals/PlaceAtmosphereLayer";
import { ContextAwareParallax } from "@/components/visuals/ContextAwareParallax";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";

const galleryImageVariants = {
  enter: { opacity: 0, scale: 1.025 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.99 },
};

export function ListingGallery({
  images,
  title,
  propertyId,
  variant = "page",
  overlayActions,
}: {
  images: PropertyImage[];
  title: string;
  propertyId: number;
  variant?: "page" | "modal";
  overlayActions?: ReactNode;
}) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [loadedGalleryImageIds, setLoadedGalleryImageIds] = useState<Set<string>>(() => new Set());
  const [imageFallbackKeys, setImageFallbackKeys] = useState<Set<string>>(() => new Set());
  const [isDesktopGallery, setIsDesktopGallery] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(min-width: 768px)").matches === true,
  );
  const warmedImageUrlsRef = useRef(new Map<string, HTMLImageElement>());
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const gallerySwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeHandledRef = useRef(false);
  const { reducedMotion } = useMotionPreference();

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateDesktopGallery = () => setIsDesktopGallery(mediaQuery.matches);
    updateDesktopGallery();
    mediaQuery.addEventListener("change", updateDesktopGallery);
    return () => mediaQuery.removeEventListener("change", updateDesktopGallery);
  }, []);

  if (images.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Aucune image disponible pour ce bien.
      </div>
    );
  }

  const safeActiveImageIndex = Math.min(activeImageIndex, images.length - 1);
  const activeImage = images[safeActiveImageIndex];
  const selectedGalleryImage = images[galleryImageIndex];
  const isSelectedGalleryImageLoaded = loadedGalleryImageIds.has(selectedGalleryImage.id);
  const imageMood = inferPlaceImageMood(title, activeImage.altText);

  const galleryImageProps = (
    image: PropertyImage,
    width: number,
    key: string,
    widths?: readonly number[],
  ) => {
    const useOriginalSource = imageFallbackKeys.has(key);
    const resizedSource = getPropertyImageUrl(image.sourceUrl, width);

    return {
      src: useOriginalSource ? image.sourceUrl : resizedSource,
      srcSet: useOriginalSource ? undefined : getPropertyImageSrcSet(image.sourceUrl, widths),
      onError: () => {
        if (useOriginalSource || resizedSource === image.sourceUrl) return;
        setImageFallbackKeys((current) => {
          if (current.has(key)) return current;
          const next = new Set(current);
          next.add(key);
          return next;
        });
      },
    };
  };

  const preloadAdjacentImages = (currentIndex: number, width = 400) => {
    if (images.length < 2) return;

    const adjacentIndexes = new Set([
      (currentIndex + images.length - 1) % images.length,
      (currentIndex + 1) % images.length,
    ]);

    adjacentIndexes.forEach((index) => {
      const photo = images[index];
      const sourceUrl = photo.sourceUrl;
      const preloadKey = `${sourceUrl}:${width}`;
      if (!sourceUrl || warmedImageUrlsRef.current.has(preloadKey)) return;

      const preloadedImage = new Image();
      preloadedImage.decoding = "async";
      preloadedImage.fetchPriority = "low";
      const isGalleryImage = width >= 900;
      preloadedImage.sizes = isGalleryImage
        ? "(max-width: 767px) 96vw, (max-width: 1279px) 72vw, 80vw"
        : "(max-width: 1023px) calc(100vw - 2rem), 66vw";
      preloadedImage.srcset = getPropertyImageSrcSet(
        sourceUrl,
        isGalleryImage ? [400, 700, 900, 1200] : undefined,
      ) ?? "";
      preloadedImage.onerror = () => {
        if (preloadedImage.src === sourceUrl) return;
        preloadedImage.srcset = "";
        preloadedImage.sizes = "";
        preloadedImage.src = sourceUrl;
      };
      preloadedImage.src = getPropertyImageUrl(sourceUrl, width);
      warmedImageUrlsRef.current.set(preloadKey, preloadedImage);
    });
  };

  const preloadGalleryImages = (currentIndex: number, width = 1200) => {
    images.forEach((photo, index) => {
      if (index === currentIndex || !photo.sourceUrl) return;

      const sourceUrl = photo.sourceUrl;
      const preloadKey = `${sourceUrl}:${width}`;
      if (warmedImageUrlsRef.current.has(preloadKey)) return;

      const preloadedImage = new Image();
      preloadedImage.decoding = "async";
      preloadedImage.fetchPriority = "low";
      preloadedImage.sizes = "(max-width: 767px) 96vw, (max-width: 1279px) 72vw, 80vw";
      preloadedImage.srcset = getPropertyImageSrcSet(sourceUrl, [400, 700, 900, 1200]) ?? "";
      preloadedImage.onerror = () => {
        if (preloadedImage.src === sourceUrl) return;
        preloadedImage.srcset = "";
        preloadedImage.sizes = "";
        preloadedImage.src = sourceUrl;
      };
      preloadedImage.src = getPropertyImageUrl(sourceUrl, width);
      warmedImageUrlsRef.current.set(preloadKey, preloadedImage);
    });
  };

  const moveImage = (direction: -1 | 1) => {
    setActiveImageIndex((index) => (index + direction + images.length) % images.length);
  };

  const moveGalleryImage = (direction: -1 | 1) => {
    setGalleryImageIndex((index) => Math.max(0, Math.min(images.length - 1, index + direction)));
  };

  const handlePhotoPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") return;
    swipeHandledRef.current = false;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePhotoPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2 || images.length < 2) return;

    event.preventDefault();
    event.stopPropagation();
    swipeHandledRef.current = true;
    moveImage(deltaX < 0 ? 1 : -1);
  };

  const handleGalleryPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    gallerySwipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleGalleryPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gallerySwipeStartRef.current;
    gallerySwipeStartRef.current = null;
    if (!start || images.length < 2) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    moveGalleryImage(deltaX < 0 ? 1 : -1);
  };

  return (
    <Dialog
      open={galleryOpen}
      onOpenChange={(open) => {
        setGalleryOpen(open);
        if (open) preloadGalleryImages(safeActiveImageIndex, 1200);
      }}
    >
      <div id={variant === "modal" ? "property-photos" : undefined} data-property-gallery className="relative">
        <DialogTrigger asChild>
          <button
            type="button"
            className={`group relative block w-full touch-pan-y overflow-hidden bg-neutral-950 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${variant === "modal" ? "rounded-none border-0" : "rounded-2xl border border-border"}`}
            aria-label={`Ouvrir la galerie photos, ${images.length} ${images.length === 1 ? "photo" : "photos"}`}
            title="Ouvrir la galerie photos"
            onPointerDown={handlePhotoPointerDown}
            onPointerUp={handlePhotoPointerUp}
            onPointerCancel={() => { swipeStartRef.current = null; }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" && images.length > 1) {
                event.preventDefault();
                event.stopPropagation();
                moveImage(-1);
              } else if (event.key === "ArrowRight" && images.length > 1) {
                event.preventDefault();
                event.stopPropagation();
                moveImage(1);
              }
            }}
            onClick={(event) => {
              if (swipeHandledRef.current) {
                swipeHandledRef.current = false;
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              setGalleryImageIndex(safeActiveImageIndex);
              trackEvent("gallery_opened", { property_id: propertyId });
            }}
          >
            <ContextAwareParallax mood={imageMood} reducedMotion={reducedMotion} intensity="immersive" scrollReactive className="z-[0]">
              <div className={`relative w-full overflow-hidden ${variant === "modal" ? "aspect-[16/8] max-h-[min(32rem,52dvh)] min-h-[14rem] sm:aspect-[16/7]" : "aspect-[16/9]"}`}>
                <AnimatePresence initial={!reducedMotion} mode="sync">
                  <motion.img
                    key={activeImage.id}
                    variants={galleryImageVariants}
                    initial={reducedMotion ? false : "enter"}
                    animate={reducedMotion ? { opacity: 1, scale: 1 } : "center"}
                    exit={reducedMotion ? { opacity: 0 } : "exit"}
                    transition={{ duration: reducedMotion ? 0 : 0.52, ease: [0.22, 1, 0.36, 1] }}
                    {...galleryImageProps(activeImage, 400, `hero:${activeImage.id}`)}
                    sizes={variant === "modal" ? "(max-width: 767px) 100vw, 88vw" : "(max-width: 1023px) calc(100vw - 2rem), 66vw"}
                    alt={activeImage.altText}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015] motion-reduce:transition-none"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    onLoad={() => preloadAdjacentImages(safeActiveImageIndex)}
                  />
                </AnimatePresence>
              </div>
            </ContextAwareParallax>
            <PlaceAtmosphereLayer mood={imageMood} animated={false} variant="gallery" className="z-[1]" />
            <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/50 via-transparent to-black/5" />
            <span className="pointer-events-none absolute bottom-4 left-4 z-[3] text-sm font-medium text-white drop-shadow sm:bottom-5 sm:left-6">
              {safeActiveImageIndex + 1} / {images.length}
            </span>
          </button>
        </DialogTrigger>
        {variant === "modal" && overlayActions && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[4] flex items-center justify-between sm:inset-x-5 sm:top-5 [&>*]:pointer-events-auto">
            {overlayActions}
          </div>
        )}
        {variant === "modal" && images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Photo précédente"
              title="Photo précédente"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                moveImage(-1);
              }}
              className="absolute left-3 top-1/2 z-[4] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black md:inline-flex md:left-5"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Photo suivante"
              title="Photo suivante"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                moveImage(1);
              }}
              className="absolute right-3 top-1/2 z-[4] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black md:inline-flex md:right-5"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <DialogContent
        data-property-gallery
        data-menu-swipe-ignore
        hideCloseButton
        overlayClassName="bg-black/45 backdrop-blur-[2px]"
        className="flex h-[min(94dvh,60rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-xl border-border bg-background p-0 shadow-2xl sm:h-[min(92dvh,56rem)] sm:max-w-7xl sm:rounded-2xl"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" && galleryImageIndex > 0) {
            event.preventDefault();
            moveGalleryImage(-1);
          } else if (event.key === "ArrowRight" && galleryImageIndex < images.length - 1) {
            event.preventDefault();
            moveGalleryImage(1);
          }
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Photos de {title}</DialogTitle>
          <DialogDescription>
            Photo {galleryImageIndex + 1} sur {images.length}. Utilisez les vignettes, les flèches ou le balayage pour parcourir les photos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex h-14 min-h-14 items-center gap-3 border-b border-border/80 px-3 sm:px-6">
          <button
            type="button"
            aria-label="Retour à l’annonce"
            onClick={() => setGalleryOpen(false)}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-3"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Retour à l’annonce</span>
            <span className="sm:hidden">Retour</span>
          </button>
          <span
            aria-current="page"
            className="relative inline-flex h-full items-center px-3 text-sm font-semibold text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground"
          >
            Photos
          </span>
          <span className="ml-auto text-sm font-medium text-muted-foreground md:hidden" aria-live="polite">
            {galleryImageIndex + 1} / {images.length}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-border/70 bg-background p-4 md:flex lg:w-72">
            <p className="mb-3 shrink-0 text-sm font-medium text-muted-foreground" aria-live="polite">
              {galleryImageIndex + 1} / {images.length}
            </p>
            <div className="grid grid-cols-3 content-start gap-2 overflow-y-auto pr-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={`group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${galleryImageIndex === index ? "ring-2 ring-foreground ring-offset-2" : "opacity-75 transition-opacity hover:opacity-100"}`}
                  aria-label={`Afficher la photo ${index + 1}`}
                  aria-current={galleryImageIndex === index ? "true" : undefined}
                  onClick={() => setGalleryImageIndex(index)}
                >
                  <img
                    {...galleryImageProps(image, 400, `desktop-thumbnail:${image.id}`)}
                    sizes="96px"
                    alt={image.altText}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                    loading={isDesktopGallery ? "eager" : "lazy"}
                    fetchPriority={galleryImageIndex === index ? "high" : "low"}
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          </aside>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden bg-background p-2 sm:p-5"
              onPointerDown={handleGalleryPointerDown}
              onPointerUp={handleGalleryPointerUp}
              onPointerCancel={() => { gallerySwipeStartRef.current = null; }}
            >
              <img
                {...galleryImageProps(selectedGalleryImage, 400, `viewer-preview:${selectedGalleryImage.id}`)}
                sizes="(max-width: 767px) 112px, 96px"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-[1.02] rounded-lg object-contain opacity-40 blur-sm"
                loading="eager"
                fetchPriority="low"
                decoding="async"
              />
              <motion.img
                key={selectedGalleryImage.id}
                {...galleryImageProps(selectedGalleryImage, 1200, `viewer:${selectedGalleryImage.id}`, [400, 700, 900, 1200])}
                sizes="(max-width: 767px) 96vw, (max-width: 1279px) 72vw, 80vw"
                alt={selectedGalleryImage.altText}
                className="h-full w-full select-none rounded-lg object-contain"
                draggable={false}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                onLoad={() => {
                  setLoadedGalleryImageIds((current) => {
                    if (current.has(selectedGalleryImage.id)) return current;
                    const next = new Set(current);
                    next.add(selectedGalleryImage.id);
                    return next;
                  });
                  preloadGalleryImages(galleryImageIndex, 1200);
                }}
                initial={reducedMotion ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: isSelectedGalleryImageLoaded ? 1 : 0, x: isSelectedGalleryImageLoaded ? 0 : 12, scale: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.2, ease: "easeOut" }}
              />

              {galleryImageIndex > 0 && (
                <button
                  type="button"
                  aria-label="Photo précédente"
                  title="Photo précédente"
                  onClick={() => moveGalleryImage(-1)}
                  className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:inline-flex"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </button>
              )}
              {galleryImageIndex < images.length - 1 && (
                <button
                  type="button"
                  aria-label="Photo suivante"
                  title="Photo suivante"
                  onClick={() => moveGalleryImage(1)}
                  className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:inline-flex"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex h-20 shrink-0 gap-2 overflow-x-auto border-t border-border/70 px-3 py-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`Afficher la photo ${index + 1}`}
                  aria-current={galleryImageIndex === index ? "true" : undefined}
                  onClick={() => setGalleryImageIndex(index)}
                  className={`relative aspect-[4/3] h-full shrink-0 overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${galleryImageIndex === index ? "ring-2 ring-foreground ring-offset-1" : "opacity-75"}`}
                >
                  <img
                    {...galleryImageProps(image, 200, `mobile-thumbnail:${image.id}`)}
                    sizes="112px"
                    alt={image.altText}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="eager"
                    fetchPriority={galleryImageIndex === index ? "high" : "low"}
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
