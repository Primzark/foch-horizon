import { useRef, useState, type TouchEvent } from "react";
import { Expand, Images } from "lucide-react";
import { motion } from "framer-motion";
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
import { cn } from "@/lib/utils";
import { inferPlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { PlaceAtmosphereLayer } from "@/components/visuals/PlaceAtmosphereLayer";
import { ContextAwareParallax } from "@/components/visuals/ContextAwareParallax";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";
import { getMotionDirectorProfile } from "@/lib/visuals/motionDirector";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";

export function ListingGallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
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

    setSelectedIndex((current) => (current + (deltaX < 0 ? 1 : -1) + images.length) % images.length);
  };

  return (
    <div>
      <div
        className="relative touch-pan-y overflow-hidden rounded-2xl border border-border"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          touchStartRef.current = null;
        }}
      >
        <ContextAwareParallax mood={imageMood} reducedMotion={reducedMotion} intensity="immersive" scrollReactive className="z-[0]">
          <img
            key={activeImage.id}
            src={getPropertyImageUrl(activeImage.sourceUrl, 400)}
            srcSet={getPropertyImageSrcSet(activeImage.sourceUrl)}
            sizes="(max-width: 1023px) calc(100vw - 2rem), 66vw"
            alt={activeImage.altText}
            className="aspect-[16/10] w-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onLoad={preloadAdjacentImages}
          />
        </ContextAwareParallax>
        <PlaceAtmosphereLayer mood={imageMood} animated={false} variant="gallery" className="z-[1]" />
        <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/22 via-black/8 to-transparent" />

        <div className="absolute left-3 top-3 z-[3] rounded-full bg-background/90 px-2 py-1 text-xs">
          <Images className="mr-1 inline h-3.5 w-3.5" />
          {activeIndex + 1}/{images.length}
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="absolute right-3 top-3 z-[3] rounded-full bg-background/90 p-2"
              aria-label="Ouvrir la galerie en plein écran"
              onClick={() => trackEvent("gallery_opened")}
            >
              <Expand className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>Galerie du bien</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              {images.map((image, index) => (
                <motion.img
                  key={image.id}
                  src={getPropertyImageUrl(image.sourceUrl, 400)}
                  srcSet={getPropertyImageSrcSet(image.sourceUrl)}
                  sizes="(max-width: 767px) 90vw, 44vw"
                  alt={image.altText}
                  className="w-full rounded-xl object-cover"
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
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-6">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "overflow-hidden rounded-lg border transition-all duration-300",
                index === activeIndex
                  ? "border-foreground ring-1 ring-foreground/40"
                  : "border-border hover:-translate-y-0.5 hover:border-brand-border",
              )}
            >
              <img
                src={getPropertyImageUrl(image.sourceUrl, 200)}
                srcSet={getPropertyImageSrcSet(image.sourceUrl, [200, 400])}
                sizes="100px"
                alt={image.altText}
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-[1.04]"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
