import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRoutePageKey, routePageLoaders, type RoutePageKey } from "@/app/router/routePageLoaders";

export function RouteIntentPrefetcher() {
  const queryClient = useQueryClient();
  const warmedRoutes = useRef(new Set<RoutePageKey>());
  const warmedProperties = useRef(new Set<number>());

  useEffect(() => {
    const prefetchForIntent = (event: Event) => {
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      let destination: URL;
      try {
        destination = new URL(link.href, window.location.href);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) return;

      const routeKey = getRoutePageKey(destination.pathname);
      if (!warmedRoutes.current.has(routeKey)) {
        warmedRoutes.current.add(routeKey);
        void routePageLoaders[routeKey]().catch(() => warmedRoutes.current.delete(routeKey));
      }

      if (routeKey !== "listingDetail") return;

      const propertyId = Number(destination.pathname.match(/^\/biens\/(\d+)/)?.[1]);
      if (!Number.isInteger(propertyId) || warmedProperties.current.has(propertyId)) return;

      warmedProperties.current.add(propertyId);
      void queryClient
        .prefetchQuery({
          queryKey: ["property", propertyId],
          queryFn: async () => {
            const { getPropertyById } = await import("@/features/listings/api/properties.service");
            return getPropertyById(propertyId);
          },
        })
        .catch(() => warmedProperties.current.delete(propertyId));
    };

    document.addEventListener("pointerover", prefetchForIntent);
    document.addEventListener("focusin", prefetchForIntent);

    return () => {
      document.removeEventListener("pointerover", prefetchForIntent);
      document.removeEventListener("focusin", prefetchForIntent);
    };
  }, [queryClient]);

  return null;
}
