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

  it("parses and builds surfaceMax / terrainMax", () => {
    const parsed = parseSearchParams(new URLSearchParams("surfaceMin=120&surfaceMax=90&terrainMin=800&terrainMax=500"));
    expect(parsed.surfaceMin).toBe(90);
    expect(parsed.surfaceMax).toBe(120);
    expect(parsed.terrainMin).toBe(500);
    expect(parsed.terrainMax).toBe(800);

    const built = buildSearchParams({
      surfaceMin: 60,
      surfaceMax: 140,
      terrainMin: 300,
      terrainMax: 900,
    });
    expect(built.get("surfaceMin")).toBe("60");
    expect(built.get("surfaceMax")).toBe("140");
    expect(built.get("terrainMin")).toBe("300");
    expect(built.get("terrainMax")).toBe("900");
  });

  it("normalizes inverted price ranges from URL params", () => {
    const parsed = parseSearchParams(new URLSearchParams("priceMin=500000&priceMax=350000"));
    expect(parsed.priceMin).toBe(350000);
    expect(parsed.priceMax).toBe(500000);
  });
});
