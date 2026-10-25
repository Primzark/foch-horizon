import { SearchCountBadge } from "@/features/listings/components/SearchCountBadge";

interface SearchAreaValueProps {
  name: string;
  count?: number;
  isLoading: boolean;
}

export function SearchAreaValue({ name, count, isLoading }: SearchAreaValueProps) {
  const countLabel = count == null ? (isLoading ? "…" : undefined) : count.toLocaleString("fr-FR");

  return (
    <span className="flex w-full min-w-0 items-center gap-2 text-sm font-normal text-foreground">
      <span className="min-w-0 truncate">{name}</span>
      {countLabel != null && (
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <SearchCountBadge size="default">{countLabel}</SearchCountBadge>
          <span className="text-sm font-normal text-foreground">{count == null ? "biens" : count > 1 ? "biens" : "bien"}</span>
        </span>
      )}
    </span>
  );
}
