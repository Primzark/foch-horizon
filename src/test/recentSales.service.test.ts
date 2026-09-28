import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PropertySearchItem } from "@/types/api";
import { getRecentSales } from "@/features/content/api/recentSales.service";
import { searchProperties } from "@/features/listings/api/properties.service";

vi.mock("@/features/listings/api/properties.service", () => ({ searchProperties: vi.fn() }));
const search = vi.mocked(searchProperties);
const item = (id: number, status: PropertySearchItem["status"], transaction: PropertySearchItem["transaction"] = "vente") => ({ id, status, transaction }) as PropertySearchItem;

describe("recent sales", () => {
  beforeEach(() => vi.resetAllMocks());
  it("includes only recorded sales, including those on later pages", async () => {
    search.mockResolvedValueOnce({ page: 1, pageSize: 100, total: 5, items: [item(1, "active"), item(2, "under_offer"), item(3, "sold")] });
    search.mockResolvedValueOnce({ page: 2, pageSize: 100, total: 5, items: [item(4, "rented", "location"), item(5, "sold")] });
    expect((await getRecentSales()).map((sale) => sale.id)).toEqual([3, 5]);
    expect(search).toHaveBeenLastCalledWith({ transaction: "vente", sort: "newest", page: 2, pageSize: 100 });
  });
  it("does not substitute active listings when there are no confirmed sales", async () => {
    search.mockResolvedValue({ page: 1, pageSize: 100, total: 1, items: [item(1, "active")] });
    expect(await getRecentSales()).toEqual([]);
  });
  it("keeps a failed request distinct from an empty collection", async () => {
    search.mockRejectedValue(new Error("Unavailable"));
    await expect(getRecentSales()).rejects.toThrow("Unavailable");
  });
});
