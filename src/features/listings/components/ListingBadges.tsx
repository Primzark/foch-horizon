import { BadgeCheck, CircleOff, Handshake, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingBadgesProps {
  labels: string[];
  className?: string;
  compact?: boolean;
}

const badgeStyles: Record<string, { icon: typeof Star; className: string }> = {
  "Exclusivité": {
    icon: Star,
    className: "bg-amber-100 text-amber-950",
  },
  "Nouveautés": {
    icon: Sparkles,
    className: "bg-emerald-100 text-emerald-950",
  },
  "Sous compromis": {
    icon: Handshake,
    className: "bg-sky-100 text-sky-950",
  },
  "Sous offre": {
    icon: Handshake,
    className: "bg-sky-100 text-sky-950",
  },
  "Vendu": {
    icon: BadgeCheck,
    className: "bg-slate-100 text-slate-900",
  },
  "Retiré": {
    icon: CircleOff,
    className: "bg-rose-100 text-rose-950",
  },
};

export function ListingBadges({ labels, className, compact = false }: ListingBadgesProps) {
  if (labels.length === 0) return null;

  return (
    <div className={cn("pointer-events-none flex flex-wrap", compact ? "gap-1" : "gap-1.5", className)}>
      {labels.map((label) => {
        const presentation = badgeStyles[label];
        if (!presentation) return null;
        const Icon = presentation.icon;

        return (
          <span
            key={label}
            className={cn(
              "inline-flex items-center rounded-full font-semibold shadow-sm",
              compact ? "gap-0.5 px-2 py-0.5 text-[10px]" : "gap-1 px-2.5 py-1 text-xs",
              presentation.className,
            )}
          >
            <Icon aria-hidden="true" className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3", label === "Exclusivité" && "fill-current")} />
            {label}
          </span>
        );
      })}
    </div>
  );
}
