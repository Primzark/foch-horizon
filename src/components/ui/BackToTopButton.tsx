import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD_PX = 320;

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });

    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const handleBackToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Remonter en haut de page"
      title="Haut de page"
      onClick={handleBackToTop}
      className={cn(
        "fixed z-[120] h-11 w-11 rounded-full border-border/70 bg-background/95 shadow-lg backdrop-blur transition-all duration-200",
        "left-[max(0.75rem,env(safe-area-inset-left))] sm:left-[max(1rem,env(safe-area-inset-left))]",
        "bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-[max(1rem,env(safe-area-inset-bottom))]",
        isVisible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-5" />
    </Button>
  );
}
