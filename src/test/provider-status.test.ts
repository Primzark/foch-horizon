import { describe, expect, it } from "vitest";
import { mapProviderPropertyStatus, mapProviderTransactionType } from "../../scripts/provider-status.mjs";

describe("property provider status mapping", () => {
  it.each([
    ["Sous offre", "under_offer"],
    ["Sous compromis de vente", "under_offer"],
    ["Offre d'achat acceptée", "under_offer"],
    ["Vendu", "sold"],
    ["Vendue", "sold"],
    ["Loué", "rented"],
    ["Retirée", "off_market"],
    ["Vente", "active"],
  ])("maps %s to %s", (label, status) => {
    expect(mapProviderPropertyStatus(label)).toBe(status);
  });

  it("keeps rental transaction labels separate from the rental listing status", () => {
    expect(mapProviderTransactionType("Location")).toBe("location");
    expect(mapProviderPropertyStatus("Location")).toBe("active");
    expect(mapProviderTransactionType("Louée")).toBe("location");
    expect(mapProviderPropertyStatus("Louée")).toBe("rented");
  });
});
