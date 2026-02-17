import { ArrowDownWideNarrow, ArrowUpNarrowWide, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sortOptions } from "@/features/listings/data/options";

interface FiltersBarProps {
  sort: string;
  onSortChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (value: "grid" | "list") => void;
  onOpenDrawer: () => void;
  total: number;
}

export function FiltersBar({ sort, onSortChange, viewMode, onViewModeChange, onOpenDrawer, total }: FiltersBarProps) {
  const reducedMotion = useReducedMotion();
  const sortHint =
    sort === "price_asc"
      ? { label: "Prix croissant", Icon: ArrowUpNarrowWide }
      : sort === "price_desc"
        ? { label: "Prix décroissant", Icon: ArrowDownWideNarrow }
        : sort === "surface_desc"
          ? { label: "Surface décroissante", Icon: ArrowDownWideNarrow }
          : { label: "Plus récents", Icon: ArrowDownWideNarrow };

  return (
    <div className="sticky top-[74px] z-30 rounded-2xl border border-border bg-background/85 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={sort}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <sortHint.Icon className="h-3.5 w-3.5" />
              {sortHint.label}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={onOpenDrawer}>
            <SlidersHorizontal className="h-4 w-4" /> Filtres
          </Button>

          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger className="w-[170px]">
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

          <div className="hidden items-center rounded-lg border border-border p-1 md:flex">
            <button
              type="button"
              className={`rounded-md p-2 ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              onClick={() => onViewModeChange("grid")}
              aria-label="Vue grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`rounded-md p-2 ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              onClick={() => onViewModeChange("list")}
              aria-label="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
