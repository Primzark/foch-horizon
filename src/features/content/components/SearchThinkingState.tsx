import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type SearchThinkingStateProps = {
  label?: string;
  details?: string;
  onCancel?: () => void;
  className?: string;
};

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
          <div aria-hidden="true" className="relative h-10 w-16 shrink-0">
            {[0, 1, 2].map((row) => (
              <div
                key={`track-${row}`}
                className="absolute left-1 right-1 h-px rounded-full bg-border/70"
                style={{ top: `${8 + row * 12}px` }}
              />
            ))}

            {[0, 1, 2].map((row) => (
              <motion.span
                key={`packet-${row}`}
                className="absolute h-1.5 w-4 rounded-full bg-gradient-to-r from-primary/30 via-primary/90 to-emerald-300/80 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                style={{ top: `${5 + row * 12}px` }}
                animate={
                  prefersReducedMotion
                    ? { opacity: [0.5, 1, 0.5] }
                    : { x: [0, 36, 0], opacity: [0.35, 1, 0.35] }
                }
                transition={{
                  duration: 1.25,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: row * 0.18,
                }}
              />
            ))}

            {[0, 1, 2].map((row) => (
              <motion.span
                key={`node-${row}`}
                className="absolute right-0 h-2.5 w-2.5 rounded-full border border-primary/40 bg-background shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]"
                style={{ top: `${3 + row * 12}px` }}
                animate={{ scale: [1, 1.12, 1], boxShadow: ["0 0 0 rgba(16,185,129,0)", "0 0 10px rgba(16,185,129,0.35)", "0 0 0 rgba(16,185,129,0)"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: row * 0.12 }}
              />
            ))}
          </div>

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
