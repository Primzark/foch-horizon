import { cn } from "@/lib/utils";

interface FiMonogramProps {
  size?: number;
  className?: string;
  title?: string;
  decorative?: boolean;
}

export function FiMonogram({ size = 30, className, title = "FI", decorative = true }: FiMonogramProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
    >
      {!decorative && <title>{title}</title>}
      <rect x="1.5" y="1.5" width="61" height="61" rx="14" fill="hsl(var(--brand-strong))" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="14" fill="none" stroke="hsl(var(--brand-border))" strokeWidth="3" />
      <path d="M10 13H52L32 4L10 13Z" fill="rgba(255,255,255,0.08)" />
      <rect x="18" y="16" width="7" height="32" rx="1.8" fill="#ffffff" />
      <rect x="18" y="16" width="23" height="7" rx="1.8" fill="#ffffff" />
      <rect x="18" y="29" width="17" height="7" rx="1.8" fill="#ffffff" />
      <rect x="40" y="16" width="7" height="32" rx="1.8" fill="#ffffff" />
    </svg>
  );
}
