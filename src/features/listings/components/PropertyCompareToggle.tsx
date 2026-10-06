import { ArrowLeftRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PROPERTY_COMPARE_LIMIT, usePropertyCompareStore } from "@/features/listings/state/usePropertyCompareStore";
import { trackEvent } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

export function PropertyCompareToggle({ propertyId, className }: { propertyId: number; className?: string }) {
  const ids = usePropertyCompareStore((state) => state.ids);
  const toggle = usePropertyCompareStore((state) => state.toggle);
  const isSelected = ids.includes(propertyId);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={isSelected}
      aria-label={isSelected ? "Retirer de la comparaison" : "Ajouter à la comparaison"}
      title={ids.length >= PROPERTY_COMPARE_LIMIT && !isSelected ? "Maximum de 3 biens" : undefined}
      className={cn(
        "h-9 gap-1.5 rounded-full px-3 text-xs",
        isSelected && "border-brand-border bg-brand-soft text-brand-strong hover:bg-brand-soft/70 hover:text-brand-strong",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isSelected && ids.length >= PROPERTY_COMPARE_LIMIT) {
          toast.info("Vous pouvez comparer jusqu’à 3 biens.");
          return;
        }
        if (toggle(propertyId)) {
          trackEvent(isSelected ? "comparison_remove" : "comparison_add", {
            property_id: propertyId,
            source: window.location.pathname,
          });
        }
      }}
    >
      {isSelected ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <ArrowLeftRight aria-hidden="true" className="h-3.5 w-3.5" />}
      <span>{isSelected ? "Ajouté" : "Comparer"}</span>
    </Button>
  );
}
