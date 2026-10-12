import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trackEvent } from "@/lib/analytics/events";

interface ListingShareButtonProps {
  propertyId: number;
  title: string;
  path: string;
  overlay?: boolean;
}

export function ListingShareButton({ propertyId, title, path, overlay = false }: ListingShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [manualShareUrl, setManualShareUrl] = useState<string | null>(null);

  async function shareProperty() {
    setIsSharing(true);
    // Share the canonical listing route, without search parameters or fragments.
    const url = new URL(path, window.location.origin).href;
    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: `${title} | Foch Immobilier`, url });
          trackEvent("listing_viewed", { propertyId, action: "share" });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          // If native sharing is unavailable or denied, offer the same link.
        }
      }

      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(url);
        toast.success("Lien du bien copié");
        trackEvent("listing_viewed", { propertyId, action: "copy_link" });
      } catch {
        setManualShareUrl(url);
      }
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size={overlay ? "icon" : "sm"}
        className={overlay ? "h-11 w-11 rounded-full border-white/35 bg-black/45 text-white shadow-md backdrop-blur-md hover:bg-black/65 hover:text-white" : undefined}
        onClick={shareProperty}
        disabled={isSharing}
        aria-label={overlay ? "Partager ce bien" : undefined}
        title={overlay ? "Partager ce bien" : undefined}
      >
        <Share2 className={overlay ? "h-5 w-5" : "mr-1 h-3.5 w-3.5"} aria-hidden="true" />
        {!overlay && "Partager"}
      </Button>
      <Dialog open={manualShareUrl !== null} onOpenChange={(open) => !open && setManualShareUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager ce bien</DialogTitle>
            <DialogDescription>Copiez ce lien pour partager l’annonce.</DialogDescription>
          </DialogHeader>
          <input
            type="text"
            readOnly
            aria-label="Lien du bien à partager"
            value={manualShareUrl ?? ""}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
