import { describe, expect, it } from "vitest";
import { validatePropertyFeed } from "../../supabase/functions/_shared/property-feed";

function makeFeed() {
  return {
    schemaVersion: 1,
    cities: [{ id: "city-test", name: "Le Havre", slug: "le-havre" }],
    agents: [],
    properties: [
      {
        id: 990001,
        title: "Test listing",
        slug: "test-listing",
        cityId: "city-test",
        transactionType: "vente",
        propertyType: "appartement",
        status: "under_offer",
        sourceStatus: "Sous compromis de vente",
        priceAmount: 125000,
        agentId: null,
      },
    ],
  };
}

describe("property feed validation", () => {
  it("accepts an external reference and retains the raw provider status", () => {
    const feed = validatePropertyFeed(makeFeed());
    expect(feed.properties[0]).toMatchObject({
      id: 990001,
      status: "under_offer",
      sourceStatus: "Sous compromis de vente",
    });
  });

  it("rejects duplicate references instead of silently creating conflicting input", () => {
    const feed = makeFeed();
    feed.properties.push({ ...feed.properties[0] });
    expect(() => validatePropertyFeed(feed)).toThrow("Property references must be unique in a feed.");
  });

  it("rejects a property that refers to a city missing from the payload", () => {
    const feed = makeFeed();
    feed.properties[0].cityId = "missing-city";
    expect(() => validatePropertyFeed(feed)).toThrow("references a city missing from the feed");
  });
});
