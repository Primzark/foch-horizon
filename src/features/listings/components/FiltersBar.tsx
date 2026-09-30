import { LayoutGrid, List, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sortOptions } from "@/features/listings/data/options";
import { useMotionPreference } from "@/lib/visuals/useMotionPreference";

interface FiltersBarProps {
  sort: string;
  onSortChange: (value: string) => void;
  viewMode: "grid" | "list" | "map";
  onViewModeChange: (value: "grid" | "list" | "map") => void;
  onOpenDrawer: () => void;
  total: number;
}

export function FiltersBar({ sort, onSortChange, viewMode, onViewModeChange, onOpenDrawer, total }: FiltersBarProps) {
  const { reducedMotion } = useMotionPreference();

  return (
    <div className="sticky top-[calc(93px+env(safe-area-inset-top))] lg:top-[calc(145px+env(safe-area-inset-top))] z-30 rounded-2xl border border-border bg-background/85 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={total}
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="inline-block"
              >
                {total}
              </motion.span>
            </AnimatePresence>{" "}
            bien{total > 1 ? "s" : ""} trouvé{total > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" className="gap-2 px-3 sm:px-4" onClick={onOpenDrawer} aria-label="Ouvrir les filtres">
            <SlidersHorizontal className="h-4 w-4" /> <span className="hidden min-[420px]:inline">Filtres</span>
          </Button>

          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger className="w-[136px] sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div role="group" aria-label="Mode d’affichage" className="flex items-center rounded-lg border border-border p-1">
            <button
              type="button"
              aria-pressed={viewMode === "grid"}
              className={`rounded-md p-2 ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              onClick={() => onViewModeChange("grid")}
              aria-label="Vue grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "list"}
              className={`rounded-md p-2 ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              onClick={() => onViewModeChange("list")}
              aria-label="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "map"}
              className={`rounded-md p-2 ${viewMode === "map" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              onClick={() => onViewModeChange("map")}
              aria-label="Vue carte"
            >
              <MapIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
