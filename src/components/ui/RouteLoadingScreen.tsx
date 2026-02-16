import { cn } from "@/lib/utils";

interface RouteLoadingScreenProps {
  fullscreen?: boolean;
  className?: string;
}

const fiLogoUrl = "https://www.fochimmobilier.com/static/img/favicon.png";

export function RouteLoadingScreen({ fullscreen = false, className }: RouteLoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-background/95 backdrop-blur-sm",
        fullscreen ? "fixed inset-0 z-[120]" : "min-h-[52vh]",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Chargement en cours"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 px-8 py-6 shadow-[0_24px_52px_-38px_rgba(14,22,34,0.55)]">
        <div className="flex items-center gap-3">
          <div className="relative overflow-hidden rounded-sm">
            <img src={fiLogoUrl} alt="FI logo" className="h-10 w-10 md:h-11 md:w-11" loading="eager" decoding="async" />
            <span className="luxury-shimmer pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/75 to-transparent" />
          </div>
          <p className="font-sans text-[2rem] font-semibold tracking-tight md:text-[2.4rem]">
            <span className="text-[#000000]">Foch</span>
            <span className="text-[#2eca6a]">Immobilier</span>
          </p>
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Chargement</p>
      </div>
    </div>
  );
}
