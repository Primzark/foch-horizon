import { useCallback, useEffect, useRef, useState } from "react";
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
import { ListingBadges } from "@/features/listings/components/ListingBadges";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";

const galleryImageVariants = {
  enter: { opacity: 0, scale: 1.025 },
  center: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.99 },
};
// 900px covers standard-density screens and matches the image requests warmed
// by the property-page gallery; retain the 1200px candidate on high-DPI desktop.
const standardDensityViewerImageWidths = [400, 700, 900] as const;
const desktopViewerImageWidths = [400, 700, 900, 1200] as const;
const thumbnailImageWidths = [200, 256] as const;
const galleryPreviewImageWidths = [200, 400] as const;

export function ListingGallery({
  images,
  title,
  propertyId,
  variant = "page",
  overlayActions,
  badgeLabels = [],
}: {
  images: PropertyImage[];
  title: string;
  propertyId: number;
  variant?: "page" | "modal";
  overlayActions?: ReactNode;
  badgeLabels?: string[];
}) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [mobileThumbnailLoadLimit, setMobileThumbnailLoadLimit] = useState(4);
  const [visibleGalleryImageId, setVisibleGalleryImageId] = useState<string | null>(() => images[0]?.id ?? null);
  const [fullResolutionGalleryImageId, setFullResolutionGalleryImageId] = useState<string | null>(() => images[0]?.id ?? null);
  const [imageFallbackKeys, setImageFallbackKeys] = useState<Set<string>>(() => new Set());
  const [isDesktopGallery, setIsDesktopGallery] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(min-width: 768px)").matches === true,
  );
  const warmedImageUrlsRef = useRef(new Map<string, HTMLImageElement>());
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const gallerySwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const galleryNavigationDirectionRef = useRef<-1 | 1>(1);
  const fullResolutionGalleryImageIdRef = useRef<string | null>(images[0]?.id ?? null);
  const selectedViewerImageRef = useRef<HTMLImageElement | null>(null);
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

  const safeGalleryImageIndex = Math.min(galleryImageIndex, Math.max(0, images.length - 1));
  const isHighDensityDesktop = isDesktopGallery
    && typeof window !== "undefined"
    && window.devicePixelRatio > 1.5;
  const viewerImageWidths = isHighDensityDesktop ? desktopViewerImageWidths : standardDensityViewerImageWidths;
  const selectedGalleryImage = images[safeGalleryImageIndex] ?? null;
  const selectedGalleryImageId = selectedGalleryImage?.id ?? null;
  const selectedGalleryImageSourceUrl = selectedGalleryImage?.sourceUrl ?? null;
  const selectedGalleryImageFallbackKey = selectedGalleryImage
    ? `viewer:${selectedGalleryImage.id}`
    : null;
  const selectedGalleryImageUsesOriginal = selectedGalleryImageFallbackKey
    ? imageFallbackKeys.has(selectedGalleryImageFallbackKey)
    : false;

  const getWarmedGalleryImage = useCallback((
    photo: Pick<PropertyImage, "id" | "sourceUrl">,
    width: number,
    fetchPriority: "high" | "low" = "low",
    useOriginalSource = false,
    widths?: readonly number[],
  ) => {
    const sourceUrl = photo.sourceUrl;
    const preloadKey = `${sourceUrl}:${width}`;
    let image = warmedImageUrlsRef.current.get(preloadKey);

    if (!image) {
      image = new Image();
      image.decoding = "async";
      const createdImage = image;
      createdImage.onerror = () => {
        if (createdImage.src === sourceUrl) return;
        createdImage.dataset.galleryFallback = "true";
        createdImage.srcset = "";
        createdImage.sizes = "";
        createdImage.src = sourceUrl;
        const fallbackKey = `${width >= 900 ? "viewer" : "hero"}:${photo.id}`;
        setImageFallbackKeys((current) => {
          if (current.has(fallbackKey)) return current;
          const next = new Set(current);
          next.add(fallbackKey);
          return next;
        });
      };
      warmedImageUrlsRef.current.set(preloadKey, image);
    }

    if (fetchPriority === "high" || image.fetchPriority !== "high") {
      image.fetchPriority = fetchPriority;
    }

    if (useOriginalSource) {
      if (image.src !== sourceUrl || image.srcset) {
        image.dataset.galleryFallback = "true";
        image.srcset = "";
        image.sizes = "";
        image.src = sourceUrl;
      }
      return image;
    }

    if (image.dataset.galleryFallback === "true") return image;

    const resizedSource = getPropertyImageUrl(sourceUrl, width);
    const isGalleryImage = width >= 900;
    const sizes = isGalleryImage
      ? "(max-width: 767px) 96vw, (max-width: 1279px) 72vw, 80vw"
      : `${width}px`;
    const srcSet = getPropertyImageSrcSet(
      sourceUrl,
      widths ?? (isGalleryImage ? desktopViewerImageWidths : [200, 400]),
    ) ?? "";

    if (image.src !== resizedSource || image.srcset !== srcSet || image.sizes !== sizes) {
      image.sizes = sizes;
      image.srcset = srcSet;
      image.src = resizedSource;
    }

    return image;
  }, []);

  useEffect(() => {
    if (!galleryOpen || !selectedGalleryImageId || !selectedGalleryImageSourceUrl) return;

    if (selectedGalleryImageId === fullResolutionGalleryImageId) return;

    let cancelled = false;
    const selectedImage = { id: selectedGalleryImageId, sourceUrl: selectedGalleryImageSourceUrl };
    const previewImage = getWarmedGalleryImage(
      selectedImage,
      400,
      "low",
      false,
      galleryPreviewImageWidths,
    );
    previewImage.decode().then(() => {
      if (!cancelled && fullResolutionGalleryImageIdRef.current !== selectedGalleryImageId) {
        setVisibleGalleryImageId(selectedGalleryImageId);
      }
    }).catch(() => undefined);

    const image = getWarmedGalleryImage(
      selectedImage,
      1200,
      "high",
      selectedGalleryImageUsesOriginal,
      viewerImageWidths,
    );
    const previousViewerImage = selectedViewerImageRef.current;
    if (previousViewerImage && previousViewerImage !== image && !previousViewerImage.complete) {
      previousViewerImage.fetchPriority = "low";
    }
    selectedViewerImageRef.current = image;

    image.decode().then(() => {
      if (!cancelled) {
        fullResolutionGalleryImageIdRef.current = selectedGalleryImageId;
        setFullResolutionGalleryImageId(selectedGalleryImageId);
        setVisibleGalleryImageId(selectedGalleryImageId);
      }
    }).catch(() => {
      if (cancelled || selectedGalleryImageUsesOriginal || getPropertyImageUrl(selectedGalleryImageSourceUrl, 1200) === selectedGalleryImageSourceUrl) return;
      setImageFallbackKeys((current) => {
        if (current.has(selectedGalleryImageFallbackKey!)) return current;
        const next = new Set(current);
        next.add(selectedGalleryImageFallbackKey!);
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    fullResolutionGalleryImageId,
    galleryOpen,
    selectedGalleryImageId,
    selectedGalleryImageSourceUrl,
    selectedGalleryImageFallbackKey,
    selectedGalleryImageUsesOriginal,
    viewerImageWidths,
    getWarmedGalleryImage,
  ]);

  useEffect(() => {
    if (images.length < 2) return;

    const currentIndex = Math.min(activeImageIndex, images.length - 1);
    const nextIndex = (currentIndex + 1) % images.length;
    const nextImage = images[nextIndex];
    if (nextImage?.sourceUrl) {
      getWarmedGalleryImage(nextImage, 1200, "low", false, viewerImageWidths);
    }
  }, [activeImageIndex, getWarmedGalleryImage, images, viewerImageWidths]);

  useEffect(() => {
    if (!galleryOpen || images.length < 2) return;

    images.forEach((image, index) => {
      if (index !== safeGalleryImageIndex && image.sourceUrl) {
        getWarmedGalleryImage(image, 400, "low", false, galleryPreviewImageWidths);
      }
    });
  }, [galleryOpen, getWarmedGalleryImage, images, safeGalleryImageIndex]);

  useEffect(() => {
    if (!galleryOpen || images.length < 2) return;

    const nextImage = images[safeGalleryImageIndex + galleryNavigationDirectionRef.current];
    if (nextImage?.sourceUrl) {
      getWarmedGalleryImage(nextImage, 1200, "low", false, viewerImageWidths);
    }
  }, [galleryOpen, getWarmedGalleryImage, images, safeGalleryImageIndex, viewerImageWidths]);

  if (images.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Aucune image disponible pour ce bien.
      </div>
    );
  }

  const safeActiveImageIndex = Math.min(activeImageIndex, images.length - 1);
  const activeImage = images[safeActiveImageIndex];
  const visibleGalleryImage = images.find((image) => image.id === visibleGalleryImageId)
    ?? images.find((image) => image.id === fullResolutionGalleryImageId)
    ?? selectedGalleryImage
    ?? images[0];
  const isVisibleGalleryImagePreview = visibleGalleryImage.id !== fullResolutionGalleryImageId;
  const visibleGalleryImageIndex = images.findIndex((image) => image.id === visibleGalleryImage.id);
  const displayedGalleryImageIndex = visibleGalleryImageIndex >= 0
    ? visibleGalleryImageIndex
    : safeGalleryImageIndex;
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

  const preloadViewerNeighbor = (
    currentIndex: number,
    direction: -1 | 1,
    fetchPriority: "high" | "low" = "low",
  ) => {
    const neighbor = images[currentIndex + direction];
    if (neighbor?.sourceUrl) {
      getWarmedGalleryImage(neighbor, 1200, fetchPriority, false, viewerImageWidths);
    }
  };

  const selectGalleryImage = (index: number) => {
    if (index !== safeGalleryImageIndex) {
      galleryNavigationDirectionRef.current = index > safeGalleryImageIndex ? 1 : -1;
    }
    setGalleryImageIndex(index);
  };

  const moveImage = (direction: -1 | 1) => {
    setActiveImageIndex((index) => (index + direction + images.length) % images.length);
  };

  const moveGalleryImage = (direction: -1 | 1) => {
    galleryNavigationDirectionRef.current = direction;
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
      }}
    >
      <div id={variant === "modal" ? "property-photos" : undefined} data-property-gallery className="relative">
        <DialogTrigger asChild>
          <button
            type="button"
            className={`group relative block w-full touch-pan-y overflow-hidden bg-white text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-black ${variant === "modal" ? "rounded-none border-0" : "rounded-2xl border border-border"}`}
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
              galleryNavigationDirectionRef.current = 1;
              preloadViewerNeighbor(safeActiveImageIndex, 1, "high");
              setMobileThumbnailLoadLimit((current) => Math.max(current, safeActiveImageIndex + 1));
              setGalleryImageIndex(safeActiveImageIndex);
              trackEvent("gallery_opened", { property_id: propertyId });
            }}
          >
            <ContextAwareParallax mood={imageMood} reducedMotion={reducedMotion} intensity="immersive" scrollReactive className="z-[0]">
              <div className={`relative w-full overflow-hidden ${variant === "modal" ? "aspect-[4/3] max-h-[min(32rem,44dvh)] min-h-[16rem] sm:aspect-[16/7]" : "aspect-[16/9]"}`}>
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
                  />
                </AnimatePresence>
              </div>
            </ContextAwareParallax>
            <PlaceAtmosphereLayer mood={imageMood} animated={false} variant="gallery" className="z-[1]" />
            <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/50 via-transparent to-black/5" />
            {badgeLabels.length > 0 && (
              <ListingBadges
                labels={badgeLabels}
                className={variant === "modal"
                  ? "absolute bottom-4 left-4 z-[3] sm:bottom-5 sm:left-6"
                  : "absolute left-4 top-4 z-[3] sm:left-6 sm:top-6"}
              />
            )}
            <span className={`pointer-events-none absolute bottom-4 z-[3] font-medium text-white drop-shadow sm:bottom-5 ${variant === "modal" ? "right-4 rounded-full bg-black/70 px-3 py-1.5 text-base sm:right-6" : "left-4 text-sm sm:left-6"}`}>
              {safeActiveImageIndex + 1} / {images.length}
            </span>
          </button>
        </DialogTrigger>
        {variant === "modal" && overlayActions && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[4] flex items-center justify-between sm:inset-x-5 sm:top-5 [&>*]:pointer-events-auto">
            {overlayActions}
          </div>
        )}
        {images.length > 1 && (
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
              className="absolute left-2 top-1/2 z-[4] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/50 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:left-5"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
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
              className="absolute right-2 top-1/2 z-[4] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/50 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:right-5"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <DialogContent
        data-property-gallery
        data-menu-swipe-ignore
        hideCloseButton
        overlayClassName="bg-black/45 backdrop-blur-[2px]"
        className="flex h-[min(94dvh,60rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-xl border-border bg-white p-0 shadow-2xl dark:bg-black sm:h-[min(92dvh,56rem)] sm:max-w-7xl sm:rounded-2xl"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" && safeGalleryImageIndex > 0) {
            event.preventDefault();
            moveGalleryImage(-1);
          } else if (event.key === "ArrowRight" && safeGalleryImageIndex < images.length - 1) {
            event.preventDefault();
            moveGalleryImage(1);
          }
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Photos de {title}</DialogTitle>
          <DialogDescription>
            Photo {safeGalleryImageIndex + 1} sur {images.length}. Utilisez les vignettes, les flèches ou le balayage pour parcourir les photos.
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
            {safeGalleryImageIndex + 1} / {images.length}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-border/70 bg-white p-4 dark:bg-black md:flex lg:w-72">
            <p className="mb-3 shrink-0 text-sm font-medium text-muted-foreground" aria-live="polite">
              {safeGalleryImageIndex + 1} / {images.length}
            </p>
            <div className="grid grid-cols-3 content-start gap-2 overflow-y-auto pr-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={`group relative aspect-[4/3] overflow-hidden rounded-lg bg-white text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-black ${safeGalleryImageIndex === index ? "after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:border-2 after:border-white after:content-['']" : "opacity-75 transition-opacity hover:opacity-100"}`}
                  aria-label={`Afficher la photo ${index + 1}`}
                  aria-current={safeGalleryImageIndex === index ? "true" : undefined}
                  onClick={() => selectGalleryImage(index)}
                >
                  <img
                    {...galleryImageProps(image, 200, `desktop-thumbnail:${image.id}`, thumbnailImageWidths)}
                    sizes="96px"
                    alt={image.altText}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                    loading={isDesktopGallery && Math.abs(index - safeGalleryImageIndex) <= 1 ? "eager" : "lazy"}
                    fetchPriority="low"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          </aside>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div
              className="relative flex min-h-0 flex-1 touch-pan-y overflow-hidden bg-white p-2 dark:bg-black sm:p-5"
              onPointerDown={handleGalleryPointerDown}
              onPointerUp={handleGalleryPointerUp}
              onPointerCancel={() => { gallerySwipeStartRef.current = null; }}
            >
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                <img
                  key={visibleGalleryImage.id}
                  {...galleryImageProps(
                    visibleGalleryImage,
                    isVisibleGalleryImagePreview ? 400 : 1200,
                    isVisibleGalleryImagePreview ? `hero:${visibleGalleryImage.id}` : `viewer:${visibleGalleryImage.id}`,
                    isVisibleGalleryImagePreview ? galleryPreviewImageWidths : viewerImageWidths,
                  )}
                  sizes="(max-width: 767px) 96vw, (max-width: 1279px) 72vw, 80vw"
                  alt={visibleGalleryImage.altText}
                  data-gallery-image-quality={isVisibleGalleryImagePreview ? "preview" : "full"}
                  className="absolute inset-0 h-full w-full select-none rounded-lg object-contain"
                  draggable={false}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  onLoad={() => preloadViewerNeighbor(displayedGalleryImageIndex, galleryNavigationDirectionRef.current)}
                />
              </div>

              {safeGalleryImageIndex > 0 && (
                <button
                  type="button"
                  aria-label="Photo précédente"
                  title="Photo précédente"
                  onClick={() => moveGalleryImage(-1)}
                  className="absolute left-2 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-white/95 text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation dark:bg-black/95 dark:hover:bg-muted sm:left-4"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
              {safeGalleryImageIndex < images.length - 1 && (
                <button
                  type="button"
                  aria-label="Photo suivante"
                  title="Photo suivante"
                  onClick={() => moveGalleryImage(1)}
                  className="absolute right-2 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-white/95 text-foreground shadow-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation dark:bg-black/95 dark:hover:bg-muted sm:right-4"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div
              className="flex h-20 shrink-0 gap-2 overflow-x-auto border-t border-border/70 px-3 py-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={(event) => {
                const container = event.currentTarget;
                const firstThumbnail = container.querySelector("button");
                if (!firstThumbnail) return;

                const itemWidth = firstThumbnail.getBoundingClientRect().width;
                const gap = Number.parseFloat(window.getComputedStyle(container).columnGap) || 0;
                const visibleLimit = Math.ceil(
                  (container.scrollLeft + container.clientWidth) / (itemWidth + gap),
                );
                setMobileThumbnailLoadLimit((current) => Math.min(images.length, Math.max(current, visibleLimit)));
              }}
            >
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`Afficher la photo ${index + 1}`}
                  aria-current={safeGalleryImageIndex === index ? "true" : undefined}
                  onClick={() => {
                    selectGalleryImage(index);
                  }}
                  className={`relative aspect-[4/3] h-full shrink-0 overflow-hidden rounded-md bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-black ${safeGalleryImageIndex === index ? "after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:border-2 after:border-white after:content-['']" : "opacity-75"}`}
                >
                  {!isDesktopGallery && index < mobileThumbnailLoadLimit && (
                    <img
                      {...galleryImageProps(image, 200, `mobile-thumbnail:${image.id}`, thumbnailImageWidths)}
                      sizes="84px"
                      alt={image.altText}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading={Math.abs(index - safeGalleryImageIndex) <= 1 ? "eager" : "lazy"}
                      fetchPriority="low"
                      decoding="async"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
