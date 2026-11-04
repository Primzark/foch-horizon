import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsUrl } from "@/lib/analytics/analyticsUrl";

describe("Analytics URL privacy", () => {
  it("removes confirmation tokens and personal query values while preserving campaign tags", () => {
    const result = sanitizeAnalyticsUrl(
      "https://www.fochimmobilier.com/alertes/confirmer?token=private-token&utm_source=gmb&utm_medium=organic&email=person%40example.com&state=private-state&q=private-search",
    );

    expect(result).toBe("https://www.fochimmobilier.com/alertes/confirmer?utm_source=gmb&utm_medium=organic");
  });

  it("leaves ordinary filter and campaign parameters intact", () => {
    const result = sanitizeAnalyticsUrl(
      "https://www.fochimmobilier.com/biens?city=le-havre&priceMax=200000&utm_campaign=spring",
    );

    expect(result).toBe("https://www.fochimmobilier.com/biens?city=le-havre&priceMax=200000&utm_campaign=spring");
  });
});
