import { useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import type { PropertySearchItem } from "@/types/api";
import { cn } from "@/lib/utils";
import { PlaceAtmosphereLayer } from "@/components/visuals/PlaceAtmosphereLayer";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";
import type { inferPlaceImageMood } from "@/lib/visuals/placeImageMotion";

interface ListingCardPhotoCarouselProps {
  item: Pick<PropertySearchItem, "title" | "coverImageUrl" | "imageUrls">;
  mood: ReturnType<typeof inferPlaceImageMood>;
  reducedMotion: boolean;
  eagerImage: boolean;
  containerClassName?: string;
  sizes: string;
  imageClassName: string;
  imageMotionClassName: string;
  overlayClassName: string;
  animateAtmosphere: boolean;
  children?: ReactNode;
}

export function ListingCardPhotoCarousel({
  item,
  mood,
  reducedMotion,
  eagerImage,
  containerClassName,
  sizes,
  imageClassName,
  imageMotionClassName,
  overlayClassName,
  animateAtmosphere,
  children,
}: ListingCardPhotoCarouselProps) {
  const imageUrls = Array.from(new Set([item.coverImageUrl, ...(item.imageUrls ?? [])].filter(Boolean)));
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastSwipeAtRef = useRef<number | null>(null);
  const safeActiveIndex = Math.min(activeImageIndex, Math.max(0, imageUrls.length - 1));
  const activeImageUrl = imageUrls[safeActiveIndex] ?? item.coverImageUrl;

  const moveImage = (direction: -1 | 1) => {
    setActiveImageIndex((index) => (index + direction + imageUrls.length) % imageUrls.length);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    lastSwipeAtRef.current = null;
    if (event.pointerType === "mouse" || imageUrls.length < 2) {
      swipeStartRef.current = null;
      return;
    }
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || imageUrls.length < 2) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    lastSwipeAtRef.current = Date.now();
    moveImage(deltaX < 0 ? 1 : -1);
  };

  return (
    <div
      className={cn("relative isolate min-w-0 touch-pan-y overflow-hidden", containerClassName)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeStartRef.current = null;
        lastSwipeAtRef.current = null;
      }}
      onClickCapture={(event) => {
        const lastSwipeAt = lastSwipeAtRef.current;
        lastSwipeAtRef.current = null;
        if (lastSwipeAt != null && Date.now() - lastSwipeAt < 700) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onKeyDown={() => {
        lastSwipeAtRef.current = null;
      }}
    >
      <motion.img
        key={activeImageUrl}
        src={getPropertyImageUrl(activeImageUrl, 400)}
        srcSet={getPropertyImageSrcSet(activeImageUrl)}
        sizes={sizes}
        alt={item.title}
        itemProp="image"
        className={cn("block w-full object-cover", imageClassName, imageMotionClassName)}
        loading={eagerImage ? "eager" : "lazy"}
        fetchPriority="low"
        decoding="async"
        initial={reducedMotion ? false : { opacity: 0.84 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }}
      />
      <PlaceAtmosphereLayer mood={mood} animated={animateAtmosphere} className="z-[1]" />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[2] transition-opacity duration-300",
          overlayClassName,
        )}
      />
      {children}
      {imageUrls.length > 1 && (
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
            className="absolute left-2 top-1/2 z-[5] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/50 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <ChevronLeft aria-hidden="true" className="h-6 w-6" />
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
            className="absolute right-2 top-1/2 z-[5] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/50 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <ChevronRight aria-hidden="true" className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}
