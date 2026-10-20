import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MainSearchBar } from "@/features/content/components/MainSearchBar";
import { properties } from "@/features/listings/data/properties";
import { SpotlightSearchModal } from "@/features/listings/components/SpotlightSearchModal";
import { searchProperties } from "@/features/listings/api/properties.service";
import { toSearchItem } from "@/features/listings/utils/mappers";
import type { PropertySearchResponse } from "@/types/api";

vi.mock("@/features/listings/api/properties.service", () => ({
  searchProperties: vi.fn(),
}));

const emptyResponse: PropertySearchResponse = {
  page: 1,
  pageSize: 48,
  total: 0,
  items: [],
};

function RouteProbe() {
  const location = useLocation();
  return <output data-testid="current-location">{`${location.pathname}${location.search}`}</output>;
}

function MainSearchHarness() {
  const seedItems = [toSearchItem(properties[1])];
  return <><MainSearchBar seedItems={seedItems} /><RouteProbe /></>;
}

function SpotlightSearchHarness() {
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <><button ref={triggerRef} type="button">Open search</button><SpotlightSearchModal open={open} onOpenChange={setOpen} triggerRef={triggerRef} /><RouteProbe /></>;
}

function renderSearch(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function getRoute(): string {
  return screen.getByTestId("current-location").textContent ?? "";
}

function expectListingSearchFor(query: string) {
  const route = new URL(getRoute(), "https://foch.example");
  expect(route.pathname).toBe("/biens");
  expect(route.searchParams.get("q")).toBe(query);
}

describe("property suggestions in public quick search", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(searchProperties).mockResolvedValue(emptyResponse);
  });

  it("keeps matching property suggestions in the homepage autocomplete", async () => {
    renderSearch(<MainSearchHarness />);
    const input = screen.getByRole("combobox", { name: "Ville, quartier, type de bien ou référence" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Sainte-Adresse" } });

    fireEvent.click(await screen.findByRole("option", { name: /Nouveauté, Dollemard limite Sainte Adresse/ }));

    expect(getRoute()).toMatch(/^\/biens\/5213-/);
  });

  it("keeps unmatched homepage searches on the listings route", async () => {
    renderSearch(<MainSearchHarness />);
    const input = screen.getByRole("combobox", { name: "Ville, quartier, type de bien ou référence" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Bordeaux" } });

    fireEvent.click(await screen.findByRole("option", { name: /Voir tous les résultats pour/ }));

    expectListingSearchFor("Bordeaux");
  });

  it("keeps unmatched header searches on the listings route", async () => {
    renderSearch(<SpotlightSearchHarness />);
    const input = screen.getByRole("combobox", { name: "Ville, quartier, type de bien ou référence" });
    fireEvent.change(input, { target: { value: "Bordeaux" } });

    fireEvent.click(await screen.findByRole("option", { name: /Voir tous les résultats pour/ }));

    expectListingSearchFor("Bordeaux");
  });
});
