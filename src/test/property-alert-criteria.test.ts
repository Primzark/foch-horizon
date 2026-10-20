import { describe, expect, it } from "vitest";
import { toPropertyAlertCriteria } from "@/features/listings/utils/propertyAlertCriteria";

describe("property alert criteria", () => {
  it("keeps active filters and excludes sort and pagination state", () => {
    const criteria = toPropertyAlertCriteria({
      transaction: "vente",
      type: "maison_villa",
      city: "le-havre",
      q: "jardin",
      bedroomsMin: 3,
      priceMax: 450_000,
      features: ["jardin", "parking", "jardin"],
      page: 4,
      pageSize: 48,
      sort: "price_asc",
    });

    expect(criteria).toEqual({
      transaction: "vente",
      type: "maison_villa",
      city: "le-havre",
      q: "jardin",
      bedroomsMin: 3,
      priceMax: 450_000,
      features: ["jardin", "parking"],
    });
    expect(criteria).not.toHaveProperty("page");
    expect(criteria).not.toHaveProperty("pageSize");
    expect(criteria).not.toHaveProperty("sort");
  });

  it("omits empty search values", () => {
    expect(toPropertyAlertCriteria({ transaction: "vente", city: "  ", q: "" })).toEqual({
      transaction: "vente",
    });
  });
});
