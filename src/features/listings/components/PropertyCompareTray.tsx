import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PROPERTY_COMPARE_LIMIT, usePropertyCompareStore } from "@/features/listings/state/usePropertyCompareStore";
import { trackEvent } from "@/lib/analytics/events";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";

export function PropertyCompareTray() {
  const ids = usePropertyCompareStore((state) => state.ids);
  const clear = usePropertyCompareStore((state) => state.clear);
  const location = useLocation();
  const navigate = useNavigate();
  const { reducedMotion } = useMotionPreference();

  const isComparisonPage = location.pathname === "/biens/comparer";
  const isPropertyPreviewModal = Boolean((location.state as { propertyModal?: boolean } | null)?.propertyModal);
  const isVisible = ids.length > 0 && !isComparisonPage && !isPropertyPreviewModal;
  const clearComparison = () => {
    ids.forEach((propertyId) => {
      trackEvent("comparison_remove", { property_id: propertyId, source: "comparison_tray_clear" });
    });
    clear();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="pointer-events-none fixed inset-x-3 bottom-[calc(8rem_+_env(safe-area-inset-bottom))] z-[90] mx-auto max-w-2xl sm:inset-x-6 lg:bottom-20"
        >
          <div
            className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/80 bg-background/95 p-2 pl-3 shadow-[0_12px_40px_rgba(24,38,31,0.16)] backdrop-blur-xl"
            role="region"
            aria-label="Comparaison de biens"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong" aria-hidden="true">
              <ArrowLeftRight className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-sm font-semibold">{ids.length}/{PROPERTY_COMPARE_LIMIT} biens</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {ids.length < 2 ? "Ajoutez un autre bien pour lancer la comparaison" : "Votre sélection est prête"}
              </p>
            </div>
            <Button
              type="button"
              variant="brand"
              size="sm"
              className="h-9 rounded-full px-3 text-xs sm:px-4"
              disabled={ids.length < 2}
              onClick={() => navigate("/biens/comparer")}
            >
              Comparer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full text-muted-foreground"
              aria-label="Vider la sélection de comparaison"
              title="Vider la sélection"
              onClick={clearComparison}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
