import { describe, expect, it } from "vitest";
import { searchGeographyGuides } from "@/features/content/utils/geographyGuideSearch";

describe("searchGeographyGuides", () => {
  it("finds an exact guide name without regard to case", () => {
    expect(searchGeographyGuides("hOnFlEuR")[0]).toMatchObject({
      id: "honfleur",
      name: "Honfleur",
    });
  });

  it("matches accents, spaces, and hyphens consistently", () => {
    expect(searchGeographyGuides("cauville sur mer")[0]?.id).toBe("cauville-sur-mer");
    expect(searchGeographyGuides("Étretat")[0]?.id).toBe("etretat");
    expect(searchGeographyGuides("Saint Romain de Colbosc")[0]?.id).toBe("saint-romain");
  });

  it("does not suggest a guide page for an unknown place", () => {
    expect(searchGeographyGuides("Bordeaux")).toEqual([]);
  });
});
