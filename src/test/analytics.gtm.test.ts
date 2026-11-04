import { afterEach, describe, expect, it, vi } from "vitest";

describe("Google Analytics page views", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
    document.head.innerHTML = "";
    document.title = "";
  });

  it("pushes one sanitized page_view data-layer event for the existing GTM event tag", async () => {
    vi.stubEnv("VITE_GTM_CONTAINER_ID", "GTM-TK2QBLFQ");
    vi.resetModules();

    const dataLayer: unknown[] = [];
    const productionWindow = {
      dataLayer,
      location: {
        hostname: "www.fochimmobilier.com",
        origin: "https://www.fochimmobilier.com",
        pathname: "/contact",
        search: "?confirmation_token=private&utm_campaign=launch",
        href: "https://www.fochimmobilier.com/contact?confirmation_token=private&utm_campaign=launch",
      },
    };
    vi.stubGlobal("window", productionWindow);

    const script = document.createElement("script");
    script.id = "gtm-GTM-TK2QBLFQ";
    document.head.append(script);
    document.title = "Contact Foch Immobilier";

    const { trackGoogleAnalyticsPageView } = await import("@/lib/analytics/gtm");
    trackGoogleAnalyticsPageView(
      productionWindow.location.href,
      "https://mail.example.test/?token=private",
    );

    const pageViews = dataLayer.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && (item as { event?: unknown }).event === "page_view",
    );

    expect(pageViews).toEqual([
      {
        event: "page_view",
        page_location: "https://www.fochimmobilier.com/contact?utm_campaign=launch",
        page_referrer: "https://mail.example.test/",
        page_title: "Contact Foch Immobilier",
      },
    ]);
  });
});
