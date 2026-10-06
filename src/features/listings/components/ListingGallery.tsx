import { useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Expand, Images } from "lucide-react";
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

export function ListingGallery({ images, title, propertyId }: { images: PropertyImage[]; title: string; propertyId: number }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const warmedImageUrlsRef = useRef(new Map<string, HTMLImageElement>());
  const { reducedMotion } = useMotionPreference();

  if (images.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Aucune image disponible pour ce bien.
      </div>
    );
  }

  const activeIndex = Math.min(selectedIndex, images.length - 1);
  const activeImage = images[activeIndex];
  const imageMood = inferPlaceImageMood(title, activeImage.altText);
  const motionDirector = getMotionDirectorProfile(imageMood);

  const navigateImage = (direction: -1 | 1) => {
    setSelectedIndex((current) => (current + direction + images.length) % images.length);
  };

  const selectImage = (index: number) => {
    if (index === activeIndex) return;
    setSelectedIndex(index);
  };

  const preloadAdjacentImages = () => {
    if (images.length < 2) return;

    [-1, 1].forEach((offset) => {
      const imageIndex = (activeIndex + offset + images.length) % images.length;
      const sourceUrl = images[imageIndex].sourceUrl;
      if (!sourceUrl || warmedImageUrlsRef.current.has(sourceUrl)) return;

      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = "low";
      image.sizes = "(max-width: 1023px) calc(100vw - 2rem), 66vw";
      image.srcset = getPropertyImageSrcSet(sourceUrl) ?? "";
      image.src = getPropertyImageUrl(sourceUrl, 400);
      warmedImageUrlsRef.current.set(sourceUrl, image);
    });
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    preloadAdjacentImages();
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || images.length < 2) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    navigateImage(deltaX < 0 ? 1 : -1);
  };

  return (
    <Dialog
      open={galleryOpen}
      onOpenChange={(open) => {
        setGalleryOpen(open);
        if (!open) setShowAllPhotos(false);
      }}
    >
      <div data-property-gallery>
        <div
          className="relative touch-pan-y overflow-hidden rounded-2xl border border-border"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            touchStartRef.current = null;
          }}
        >
          <ContextAwareParallax mood={imageMood} reducedMotion={reducedMotion} intensity="immersive" scrollReactive className="z-[0]">
            <div className="relative aspect-[16/10] w-full overflow-hidden">
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
                  sizes="(max-width: 1023px) calc(100vw - 2rem), 66vw"
                  alt={activeImage.altText}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  onLoad={preloadAdjacentImages}
                />
              </AnimatePresence>
            </div>
          </ContextAwareParallax>
          <PlaceAtmosphereLayer mood={imageMood} animated={false} variant="gallery" className="z-[1]" />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/22 via-black/8 to-transparent" />

          <div className="absolute left-3 top-3 z-[3] rounded-full bg-background/90 px-2 py-1 text-xs">
            <Images className="mr-1 inline h-3.5 w-3.5" />
            {activeIndex + 1}/{images.length}
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Image précédente"
                title="Image précédente"
                onClick={() => navigateImage(-1)}
                className="absolute left-3 top-1/2 z-[4] -translate-y-1/2 rounded-full bg-background/90 p-2.5 shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Image suivante"
                title="Image suivante"
                onClick={() => navigateImage(1)}
                className="absolute right-3 top-1/2 z-[4] -translate-y-1/2 rounded-full bg-background/90 p-2.5 shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}

          <DialogTrigger asChild>
            <button
              type="button"
              className="absolute right-3 top-3 z-[3] rounded-full bg-background/90 p-2"
              aria-label="Ouvrir la galerie en plein écran"
              onClick={() => {
                setShowAllPhotos(false);
                trackEvent("gallery_opened", { property_id: propertyId });
              }}
            >
              <Expand className="h-4 w-4" />
            </button>
          </DialogTrigger>
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex justify-end">
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:border-brand-border hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => {
                  setShowAllPhotos(true);
                  trackEvent("gallery_opened", { property_id: propertyId });
                }}
              >
                <Images className="h-4 w-4" aria-hidden="true" />
                Voir les {images.length} photos
              </button>
            </DialogTrigger>
          </div>
        )}

        <DialogContent data-property-gallery className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {showAllPhotos ? `Toutes les photos du bien (${images.length})` : `Photo ${activeIndex + 1} sur ${images.length}`}
            </DialogDescription>
          </DialogHeader>
          {showAllPhotos ? (
            <div>
              <button
                type="button"
                className="mb-4 inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
                onClick={() => setShowAllPhotos(false)}
              >
                Revenir à la photo principale
              </button>
              <div className="grid gap-3 md:grid-cols-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    className="group relative overflow-hidden rounded-xl bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`Afficher la photo ${index + 1} en grand`}
                    onClick={() => {
                      selectImage(index);
                      setShowAllPhotos(false);
                    }}
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
            </div>
          ) : (
            <div className="relative isolate flex h-[min(68dvh,48rem)] min-h-[16rem] items-center justify-center overflow-hidden rounded-xl bg-neutral-950">
              <div className="absolute left-3 top-3 z-10 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium">
                {activeIndex + 1} / {images.length}
              </div>
              {images.length > 1 && (
                <button
                  type="button"
                  className="absolute bottom-3 right-3 z-10 inline-flex min-h-10 items-center gap-2 rounded-full bg-background/90 px-4 text-sm font-medium shadow-sm"
                  onClick={() => setShowAllPhotos(true)}
                >
                  <Images className="h-4 w-4" aria-hidden="true" />
                  Voir toutes les photos
                </button>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Photo précédente"
                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2.5 shadow-md"
                    onClick={() => navigateImage(-1)}
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Photo suivante"
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/90 p-2.5 shadow-md"
                    onClick={() => navigateImage(1)}
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </>
              )}
              <AnimatePresence mode="wait" initial={!reducedMotion}>
                <motion.img
                  key={activeImage.id}
                  src={getPropertyImageUrl(activeImage.sourceUrl, 1200)}
                  srcSet={getPropertyImageSrcSet(activeImage.sourceUrl)}
                  sizes="(max-width: 767px) 90vw, 80vw"
                  alt={activeImage.altText}
                  className="h-full w-full object-contain"
                  loading="eager"
                  decoding="async"
                  initial={reducedMotion ? false : "enter"}
                  animate="center"
                  exit={reducedMotion ? { opacity: 0 } : "exit"}
                  variants={galleryImageVariants}
                  transition={{ duration: reducedMotion ? 0 : 0.52, ease: [0.22, 1, 0.36, 1] }}
                />
              </AnimatePresence>
            </div>
          )}
        </DialogContent>
      </div>
    </Dialog>
  );
}
