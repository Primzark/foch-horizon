import { Button } from "@/components/ui/button";

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function PaginationBar({ page, pageSize, total, onChange }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  const pages = [];
  for (let current = 1; current <= totalPages; current += 1) {
    pages.push(current);
  }

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination des biens">
      <Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Précédent
      </Button>
      {pages.map((current) => (
        <Button key={current} variant={current === page ? "default" : "outline"} onClick={() => onChange(current)}>
          {current}
        </Button>
      ))}
      <Button variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Suivant
      </Button>
    </nav>
  );
}
