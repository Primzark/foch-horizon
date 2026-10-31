import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function PropertyEmptyState({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-dashed border-border px-5 py-8", className)}
      {...props}
    />
  );
}
