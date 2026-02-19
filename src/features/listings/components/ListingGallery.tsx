import { useState } from "react";
import { Expand, Images } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
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
import { getPlaceImageMotionPreset, inferPlaceImageMood } from "@/lib/visuals/placeImageMotion";
import { PlaceAtmosphereLayer } from "@/components/visuals/PlaceAtmosphereLayer";

export function ListingGallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  if (images.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Aucune image disponible pour ce bien.
      </div>
    );
  }

  const activeImage = images[selectedIndex];
  const imageMood = inferPlaceImageMood(title, activeImage.altText);
  const imageMotionPreset = getPlaceImageMotionPreset(imageMood);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <motion.img
          key={activeImage.id}
          src={activeImage.sourceUrl}
          alt={activeImage.altText}
          className="aspect-[16/10] w-full object-cover"
          initial={reducedMotion ? { opacity: 0.86 } : { opacity: 0, scale: imageMotionPreset.enterScale, y: imageMotionPreset.enterY }}
          animate={
            reducedMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: [1, imageMotionPreset.hoverScale - 0.01, 1], y: [0, imageMotionPreset.hoverY, 0] }
          }
          transition={
            reducedMotion
              ? { duration: 0.28, ease: "easeOut" }
              : {
                  opacity: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
                  scale: { duration: imageMotionPreset.floatDuration, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
                  y: { duration: imageMotionPreset.floatDuration, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
                }
          }
        />
        <PlaceAtmosphereLayer mood={imageMood} animated={!reducedMotion} className="z-[1]" />
        <motion.div
          className={cn("pointer-events-none absolute inset-0 z-[2] bg-gradient-to-br", imageMotionPreset.overlayClassName)}
          animate={reducedMotion ? { opacity: 0.32 } : { opacity: [0.28, 0.45, 0.28] }}
          transition={{
            duration: imageMotionPreset.floatDuration - 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />

        <div className="absolute left-3 top-3 z-[3] rounded-full bg-background/90 px-2 py-1 text-xs">
          <Images className="mr-1 inline h-3.5 w-3.5" />
          {selectedIndex + 1}/{images.length}
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
                  src={image.sourceUrl}
                  alt={image.altText}
                  className="w-full rounded-xl object-cover"
                  initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
                  whileInView={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.24 }}
                  transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.2), ease: "easeOut" }}
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
                index === selectedIndex
                  ? "border-foreground ring-1 ring-foreground/40"
                  : "border-border hover:-translate-y-0.5 hover:border-brand-border",
              )}
            >
              <img
                src={image.sourceUrl}
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
