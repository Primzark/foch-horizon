import { ArrowDownRight, BadgeCheck, FileCheck2, Handshake, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingBadgesProps {
  labels: string[];
  className?: string;
}

const badgeStyles: Record<string, { icon: typeof Star; className: string }> = {
  "Exclusivité": {
    icon: Star,
    className: "bg-amber-100 text-amber-950",
  },
  "Nouveauté": {
    icon: Sparkles,
    className: "bg-emerald-100 text-emerald-950",
  },
  "Nouveautés": {
    icon: Sparkles,
    className: "bg-emerald-100 text-emerald-950",
  },
  "Baisse de prix": {
    icon: ArrowDownRight,
    className: "bg-orange-100 text-orange-950",
  },
  "Sous compromis": {
    icon: FileCheck2,
    className: "bg-sky-100 text-sky-950",
  },
  "Sous offre": {
    icon: Handshake,
    className: "bg-sky-100 text-sky-950",
  },
  "Vendu par l’agence": {
    icon: BadgeCheck,
    className: "bg-slate-100 text-slate-900",
  },
};

export function ListingBadges({ labels, className }: ListingBadgesProps) {
  if (labels.length === 0) return null;

  return (
    <div className={cn("pointer-events-none flex flex-wrap gap-1.5", className)}>
      {labels.map((label) => {
        const presentation = badgeStyles[label] ?? badgeStyles["Vendu par l’agence"];
        const Icon = presentation.icon;

        return (
          <span
            key={label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm",
              presentation.className,
            )}
          >
            <Icon aria-hidden="true" className={cn("h-3 w-3", label === "Exclusivité" && "fill-current")} />
            {label}
          </span>
        );
      })}
    </div>
  );
}
