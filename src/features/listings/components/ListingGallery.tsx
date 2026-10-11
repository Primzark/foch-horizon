import { useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";
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
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const warmedImageUrlsRef = useRef(new Map<string, HTMLImageElement>());
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeHandledRef = useRef(false);
  const { reducedMotion } = useMotionPreference();

  if (images.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Aucune image disponible pour ce bien.
      </div>
    );
  }

  const safeActiveImageIndex = Math.min(activeImageIndex, images.length - 1);
  const activeImage = images[safeActiveImageIndex];
  const imageMood = inferPlaceImageMood(title, activeImage.altText);
  const motionDirector = getMotionDirectorProfile(imageMood);

  const preloadAdjacentImages = (currentIndex: number) => {
    if (images.length < 2) return;

    const adjacentIndexes = new Set([
      (currentIndex + images.length - 1) % images.length,
      (currentIndex + 1) % images.length,
    ]);

    adjacentIndexes.forEach((index) => {
      const photo = images[index];
      const sourceUrl = photo.sourceUrl;
      if (!sourceUrl || warmedImageUrlsRef.current.has(sourceUrl)) return;

      const preloadedImage = new Image();
      preloadedImage.decoding = "async";
      preloadedImage.fetchPriority = "low";
      preloadedImage.sizes = "(max-width: 1023px) calc(100vw - 2rem), 66vw";
      preloadedImage.srcset = getPropertyImageSrcSet(sourceUrl) ?? "";
      preloadedImage.src = getPropertyImageUrl(sourceUrl, 400);
      warmedImageUrlsRef.current.set(sourceUrl, preloadedImage);
    });
  };

  const moveImage = (direction: -1 | 1) => {
    setActiveImageIndex((index) => (index + direction + images.length) % images.length);
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

  return (
    <Dialog
      open={galleryOpen}
      onOpenChange={(open) => {
        setGalleryOpen(open);
        if (!open) setZoomedImageIndex(null);
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
              trackEvent("gallery_opened", { property_id: propertyId });
            }}
          >
            <ContextAwareParallax mood={imageMood} reducedMotion={reducedMotion} intensity="immersive" scrollReactive className="z-[0]">
              <div className={`relative w-full overflow-hidden ${variant === "modal" ? "aspect-[16/8] max-h-[32rem] min-h-[14rem] sm:aspect-[16/7]" : "aspect-[16/9]"}`}>
                <AnimatePresence initial={!reducedMotion} mode="sync">
                  <motion.img
                    key={activeImage.id}
                    variants={galleryImageVariants}
                    initial={reducedMotion ? false : "enter"}
                    animate={reducedMotion ? { opacity: 1, scale: 1 } : "center"}
                    exit={reducedMotion ? { opacity: 0 } : "exit"}
                    transition={{ duration: reducedMotion ? 0 : 0.52, ease: [0.22, 1, 0.36, 1] }}
                    src={getPropertyImageUrl(activeImage.sourceUrl, 400)}
                    srcSet={getPropertyImageSrcSet(activeImage.sourceUrl)}
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
              className="absolute left-3 top-1/2 z-[4] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:left-5"
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
              className="absolute right-3 top-1/2 z-[4] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:right-5"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <DialogContent
        data-property-gallery
        data-menu-swipe-ignore
        hideCloseButton={zoomedImageIndex !== null}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {zoomedImageIndex === null
              ? `Toutes les photos du bien (${images.length})`
              : `Photo ${zoomedImageIndex + 1} sur ${images.length}`}
          </DialogDescription>
        </DialogHeader>
        {zoomedImageIndex === null ? (
          <div className="grid gap-3 md:grid-cols-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className="group relative overflow-hidden rounded-xl bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Agrandir la photo ${index + 1}`}
                onClick={() => setZoomedImageIndex(index)}
              >
                <motion.img
                  src={getPropertyImageUrl(image.sourceUrl, 400)}
                  srcSet={getPropertyImageSrcSet(image.sourceUrl)}
                  sizes="(max-width: 767px) 90vw, 44vw"
                  alt={image.altText}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none"
                  loading="lazy"
                  decoding="async"
                  initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                  whileInView={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.24 }}
                  transition={{
                    duration: motionDirector.revealDuration * 0.78,
                    delay: Math.min(index * motionDirector.revealStagger, 0.2),
                    ease: "easeOut",
                  }}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="relative flex h-[min(72dvh,52rem)] min-h-[16rem] items-center justify-center overflow-hidden rounded-xl bg-neutral-950">
            <motion.img
              key={images[zoomedImageIndex].id}
              src={getPropertyImageUrl(images[zoomedImageIndex].sourceUrl, 1200)}
              srcSet={getPropertyImageSrcSet(images[zoomedImageIndex].sourceUrl)}
              sizes="(max-width: 767px) 90vw, 80vw"
              alt={images[zoomedImageIndex].altText}
              className="h-full w-full object-contain"
              loading="eager"
              decoding="async"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }}
            />
            <button
              type="button"
              aria-label="Fermer l’agrandissement et revenir aux photos"
              title="Retour aux photos"
              onClick={() => setZoomedImageIndex(null)}
              className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/95 shadow-md transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
