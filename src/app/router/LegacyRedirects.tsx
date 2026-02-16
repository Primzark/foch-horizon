import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPropertyById, resolveLegacySlugToProperty } from "@/features/listings/api/properties.service";
import { toCanonicalPropertyPath } from "@/features/listings/utils/formatting";

export function LegacyAnnonceRedirect() {
  const { id } = useParams();
  const numericId = Number(id);

  const query = useQuery({
    queryKey: ["legacy-annonce", numericId],
    enabled: Number.isInteger(numericId),
    queryFn: () => getPropertyById(numericId),
  });

  if (!Number.isInteger(numericId)) {
    return <Navigate to="/biens" replace />;
  }

  if (query.isLoading) {
    return null;
  }

  if (!query.data) {
    return <Navigate to="/biens" replace />;
  }

  return <Navigate to={toCanonicalPropertyPath(query.data)} replace />;
}

export function LegacyPropertySlugRedirect() {
  const { slug } = useParams();

  const query = useQuery({
    queryKey: ["legacy-property-slug", slug],
    enabled: Boolean(slug),
    queryFn: () => resolveLegacySlugToProperty(slug ?? ""),
  });

  if (query.isLoading) {
    return null;
  }

  if (!query.data) {
    return <Navigate to="/biens" replace />;
  }

  return <Navigate to={toCanonicalPropertyPath(query.data)} replace />;
}

export function QueryRedirect({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}
