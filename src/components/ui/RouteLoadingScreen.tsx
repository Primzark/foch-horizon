import { cn } from "@/lib/utils";
import { FiMonogram } from "@/components/branding/FiMonogram";

interface RouteLoadingScreenProps {
  fullscreen?: boolean;
  className?: string;
}

export function RouteLoadingScreen({ fullscreen = false, className }: RouteLoadingScreenProps) {
  return (
    <div
      className={cn(
        "pointer-events-none flex items-center justify-center bg-background/95 backdrop-blur-sm",
        fullscreen ? "fixed inset-0 z-[120]" : "min-h-[52vh]",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Chargement en cours"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-6 shadow-[0_24px_52px_-38px_rgba(14,22,34,0.55)]">
        <div className="relative overflow-hidden rounded-sm">
          <FiMonogram size={48} decorative={false} title="FI" className="h-11 w-11 md:h-12 md:w-12" />
          <span className="luxury-shimmer pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/75 to-transparent" />
        </div>
      </div>
    </div>
  );
}
