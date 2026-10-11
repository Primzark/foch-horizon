import { useRef, useState } from "react";
import { Images, X } from "lucide-react";
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
}: {
  images: PropertyImage[];
  title: string;
  propertyId: number;
  variant?: "page" | "modal";
}) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [zoomedImageIndex, setZoomedImageIndex] = useState<number | null>(null);
  const warmedImageUrlsRef = useRef(new Map<string, HTMLImageElement>());
  const { reducedMotion } = useMotionPreference();

  if (images.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Aucune image disponible pour ce bien.
      </div>
    );
  }

  const activeImage = images[0];
  const imageMood = inferPlaceImageMood(title, activeImage.altText);
  const motionDirector = getMotionDirectorProfile(imageMood);

  const preloadGalleryImages = () => {
    if (images.length < 2) return;

    images.slice(1, 3).forEach((photo) => {
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

  return (
    <Dialog
      open={galleryOpen}
      onOpenChange={(open) => {
        setGalleryOpen(open);
        if (!open) setZoomedImageIndex(null);
      }}
    >
      <div id={variant === "modal" ? "property-photos" : undefined} data-property-gallery>
        <DialogTrigger asChild>
          <button
            type="button"
            className={`group relative block w-full overflow-hidden bg-neutral-950 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${variant === "modal" ? "rounded-none border-0" : "rounded-2xl border border-border"}`}
            aria-label={`Ouvrir la galerie photos, ${images.length} ${images.length === 1 ? "photo" : "photos"}`}
            title="Ouvrir la galerie photos"
            onClick={() => trackEvent("gallery_opened", { property_id: propertyId })}
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
                    onLoad={preloadGalleryImages}
                  />
                </AnimatePresence>
              </div>
            </ContextAwareParallax>
            <PlaceAtmosphereLayer mood={imageMood} animated={false} variant="gallery" className="z-[1]" />
            <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/50 via-transparent to-black/5" />
            <span className="pointer-events-none absolute bottom-4 left-4 z-[3] text-sm font-medium text-white drop-shadow sm:bottom-5 sm:left-6">
              {images.length} {images.length === 1 ? "photo" : "photos"}
            </span>
            <span className="pointer-events-none absolute bottom-3 right-3 z-[3] inline-flex min-h-10 items-center gap-2 rounded-full bg-background/95 px-3.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition-transform group-hover:-translate-y-0.5 sm:bottom-4 sm:right-4">
              <Images className="h-4 w-4" aria-hidden="true" />
              Voir les photos
            </span>
          </button>
        </DialogTrigger>
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
