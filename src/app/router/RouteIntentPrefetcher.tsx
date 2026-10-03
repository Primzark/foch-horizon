import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRoutePageKey, routePageLoaders, type RoutePageKey } from "@/app/router/routePageLoaders";

export function RouteIntentPrefetcher() {
  const queryClient = useQueryClient();
  const warmedRoutes = useRef(new Set<RoutePageKey>());
  const warmedProperties = useRef(new Set<number>());
  const warmedPropertyImages = useRef(new Map<string, HTMLImageElement>());

  useEffect(() => {
    const imageIntentTimers = new Map<HTMLAnchorElement, number>();

    const prefetchPropertyHero = (link: HTMLAnchorElement) => {
      const cardImage = link.querySelector<HTMLImageElement>("img");
      if (!cardImage) return;

      const imageKey = cardImage.srcset || cardImage.currentSrc || cardImage.src;
      if (warmedPropertyImages.current.has(imageKey)) return;

      const heroImage = new Image();
      heroImage.decoding = "async";
      heroImage.fetchPriority = "low";
      heroImage.sizes = "(max-width: 1023px) calc(100vw - 2rem), 66vw";
      heroImage.srcset = cardImage.srcset;
      heroImage.src = cardImage.currentSrc || cardImage.src;
      warmedPropertyImages.current.set(imageKey, heroImage);
    };

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

      const imageIntentTimer = imageIntentTimers.get(link);
      if (imageIntentTimer != null) {
        window.clearTimeout(imageIntentTimer);
        imageIntentTimers.delete(link);
      }
      if (event.type === "pointerover") {
        imageIntentTimers.set(link, window.setTimeout(() => {
          imageIntentTimers.delete(link);
          prefetchPropertyHero(link);
        }, 120));
      } else {
        prefetchPropertyHero(link);
      }

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

    const clearImageIntent = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || event.relatedTarget instanceof Node && link.contains(event.relatedTarget)) return;

      const timer = imageIntentTimers.get(link);
      if (timer == null) return;
      window.clearTimeout(timer);
      imageIntentTimers.delete(link);
    };

    document.addEventListener("pointerover", prefetchForIntent);
    // Start route and detail-data work at the beginning of a click/tap, including
    // touch devices where there may be no useful hover interval.
    document.addEventListener("pointerdown", prefetchForIntent);
    document.addEventListener("focusin", prefetchForIntent);
    document.addEventListener("pointerout", clearImageIntent);

    return () => {
      document.removeEventListener("pointerover", prefetchForIntent);
      document.removeEventListener("pointerdown", prefetchForIntent);
      document.removeEventListener("focusin", prefetchForIntent);
      document.removeEventListener("pointerout", clearImageIntent);
      imageIntentTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [queryClient]);

  return null;
}
