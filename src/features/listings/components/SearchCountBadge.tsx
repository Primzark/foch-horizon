import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type SearchCountBadgeProps = ComponentProps<"span"> & {
  size?: "compact" | "default" | "large";
};

export function SearchCountBadge({ size = "default", className, ...props }: SearchCountBadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-brand-border/40 bg-brand-soft font-bold leading-none tabular-nums text-brand-strong",
        size === "compact"
          ? "min-w-7 px-1.5 py-0.5 text-[11px]"
          : size === "large"
            ? "min-w-9 px-2.5 py-1.5 text-base"
            : "min-w-8 px-2 py-1 text-sm",
        className,
      )}
    />
  );
}
