import { useState } from "react";
import { Expand, Images } from "lucide-react";
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

export function ListingGallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Aucune image disponible pour ce bien.
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <img
          src={images[selectedIndex].sourceUrl}
          alt={images[selectedIndex].altText}
          className="aspect-[16/10] w-full object-cover"
        />

        <div className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-1 text-xs">
          <Images className="mr-1 inline h-3.5 w-3.5" />
          {selectedIndex + 1}/{images.length}
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full bg-background/90 p-2"
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
              {images.map((image) => (
                <img key={image.id} src={image.sourceUrl} alt={image.altText} className="w-full rounded-xl object-cover" />
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
              className={`overflow-hidden rounded-lg border ${index === selectedIndex ? "border-foreground" : "border-border"}`}
            >
              <img src={image.sourceUrl} alt={image.altText} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
