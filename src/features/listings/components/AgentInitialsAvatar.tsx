import { cn } from "@/lib/utils";

export function AgentInitialsAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("fr-FR"))
    .join("");

  return (
    <div aria-hidden="true" className={cn("flex items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-strong", className)}>
      {initials}
    </div>
  );
}
