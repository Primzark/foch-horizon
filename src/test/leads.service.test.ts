import { describe, expect, it } from "vitest";
import { submitLead } from "@/features/leads/api/leads.service";

describe("lead routing", () => {
  it("assigns property lead to property agent", async () => {
    const result = await submitLead({
      source: "property_page",
      propertyId: 5139,
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean.dupont@example.com",
      message: "Bonjour, je souhaite visiter ce bien rapidement.",
      consent: true,
    });

    expect(result.ok).toBe(true);
    expect(result.assignedAgentId).toBeTruthy();
  });

  it("assigns city lead when property is absent", async () => {
    const result = await submitLead({
      source: "contact_page",
      cityId: "city-le-havre",
      firstName: "Lina",
      lastName: "Martin",
      email: "lina.martin@example.com",
      message: "Je souhaite échanger sur un projet de vente.",
      consent: true,
    });

    expect(result.ok).toBe(true);
    expect(result.assignedAgentId).toBeTruthy();
  });
});
