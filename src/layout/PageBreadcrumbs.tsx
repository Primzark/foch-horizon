import { Link, useLocation } from "react-router-dom";
import { pageBreadcrumbs } from "@/lib/seo/entities";

export function PageBreadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = pageBreadcrumbs(pathname);
  if (!crumbs.length || pathname.startsWith("/admin")) return null;
  return <nav aria-label="Fil d’Ariane" className="container mx-auto px-4 py-3 text-xs text-muted-foreground">
    <ol className="flex flex-wrap items-center gap-2">
      {crumbs.map((crumb, index) => <li key={crumb.path} className="flex items-center gap-2">
        {index > 0 && <span aria-hidden="true">/</span>}
        {index === crumbs.length - 1 ? <span aria-current="page">{crumb.name}</span> : <Link to={crumb.path} className="underline underline-offset-4">{crumb.name}</Link>}
      </li>)}
    </ol>
  </nav>;
}
