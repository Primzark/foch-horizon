import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type SearchThinkingStateProps = {
  label?: string;
  details?: string;
  onCancel?: () => void;
  className?: string;
};

type SearchThinkingIndicatorProps = {
  compact?: boolean;
  className?: string;
};

export function SearchThinkingIndicator({ compact = false, className }: SearchThinkingIndicatorProps) {
  const prefersReducedMotion = useReducedMotion();
  const trackPositions = compact ? [3, 9, 15] : [8, 20, 32];
  const packetPositions = compact ? [1, 7, 13] : [5, 17, 29];
  const nodePositions = compact ? [1, 7, 13] : [3, 15, 27];
  const packetTravel = compact ? 18 : 36;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block shrink-0",
        compact ? "h-5 w-9 overflow-hidden" : "h-10 w-16",
        className,
      )}
    >
      <span
        className={cn("absolute left-0 top-0", compact ? "h-5 w-9" : "h-10 w-16")}
      >
        {trackPositions.map((position, row) => (
          <span
            key={`track-${row}`}
            className={cn(
              "absolute h-px rounded-full",
              compact ? "left-0.5 right-0.5 bg-foreground/30" : "left-1 right-1 bg-border/70",
            )}
            style={{ top: `${position}px` }}
          />
        ))}

        {packetPositions.map((position, row) => (
          <motion.span
            key={`packet-${row}`}
            className={cn(
              "absolute rounded-full shadow-[0_0_8px_rgba(16,185,129,0.45)] will-change-transform",
              compact
                ? "left-0.5 h-1 w-2.5 bg-gradient-to-r from-emerald-600/55 via-emerald-600 to-emerald-500 dark:from-emerald-200/55 dark:via-emerald-300 dark:to-emerald-200"
                : "h-1.5 w-4 bg-gradient-to-r from-primary/30 via-primary/90 to-emerald-300/80",
            )}
            style={{ top: `${position}px` }}
            initial={{ x: 0, opacity: 0.4 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { x: packetTravel, opacity: 1 }}
            transition={{
              duration: prefersReducedMotion ? 1.1 : 0.85,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: row * 0.18,
            }}
          />
        ))}

        {nodePositions.map((position, row) => (
          <motion.span
            key={`node-${row}`}
            className={cn(
              "absolute right-0 rounded-full bg-background",
              compact
                ? "h-1 w-1 border border-emerald-700/80 dark:border-emerald-300/80"
                : "h-2.5 w-2.5 border border-primary/40 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]",
            )}
            style={{ top: `${position}px` }}
            animate={prefersReducedMotion ? { opacity: [0.7, 1, 0.7] } : {
              scale: [1, 1.12, 1],
              boxShadow: [
                "0 0 0 rgba(16,185,129,0)",
                "0 0 10px rgba(16,185,129,0.45)",
                "0 0 0 rgba(16,185,129,0)",
              ],
            }}
            transition={{
              duration: prefersReducedMotion ? 1.5 : 1.2,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
              delay: row * 0.12,
            }}
          />
        ))}
      </span>
    </span>
  );
}

export function SearchThinkingState({
  label = "je cherche",
  details,
  onCancel,
  className,
}: SearchThinkingStateProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("max-w-[82%] rounded-2xl border border-border/70 bg-muted/70 p-2.5 text-sm shadow-sm", className)}
    >
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary/12 to-transparent"
          animate={
            prefersReducedMotion
              ? { opacity: [0.25, 0.35, 0.25] }
              : { x: ["-10%", "230%"] }
          }
          transition={
            prefersReducedMotion
              ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
              : { duration: 1.9, repeat: Infinity, ease: "easeInOut" }
          }
        />

        <div className="relative flex items-center gap-3">
          <SearchThinkingIndicator />

          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{label}</p>
            {details && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{details}</p>}
          </div>

          <div aria-hidden="true" className="flex items-end gap-0.5">
            {[0, 1, 2, 3].map((bar) => (
              <motion.span
                key={`bar-${bar}`}
                className="w-1 rounded-full bg-gradient-to-t from-primary/25 to-primary/80"
                animate={prefersReducedMotion ? { opacity: [0.55, 0.9, 0.55] } : { height: [7, 13, 8, 15, 7] }}
                transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut", delay: bar * 0.08 }}
                style={{ height: 8 + (bar % 2) * 3 }}
              />
            ))}
          </div>
        </div>
      </div>

      {onCancel && (
        <button type="button" onClick={onCancel} className="mt-2 text-xs underline underline-offset-2">
          Annuler et reprendre la saisie
        </button>
      )}
    </div>
  );
}
