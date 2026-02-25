import { describe, expect, it } from "vitest";
import { buildSearchParams, parseSearchParams } from "@/features/listings/utils/query";

describe("listings query param normalization", () => {
  it("ignores invalid pageSize values from the URL", () => {
    const parsed = parseSearchParams(new URLSearchParams("page=1&pageSize=1&sort=newest"));

    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBeUndefined();
  });

  it("omits default pageSize from generated listings URLs", () => {
    const params = buildSearchParams({
      page: 1,
      pageSize: 12,
      sort: "newest",
    });

    expect(params.get("page")).toBe("1");
    expect(params.get("pageSize")).toBeNull();
  });

  it("keeps allowed non-default pageSize values", () => {
    const params = buildSearchParams({
      page: 2,
      pageSize: 48,
      sort: "newest",
    });

    expect(params.get("page")).toBe("2");
    expect(params.get("pageSize")).toBe("48");
  });
});
