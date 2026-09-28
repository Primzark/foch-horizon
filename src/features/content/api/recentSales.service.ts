import { searchProperties } from "@/features/listings/api/properties.service";
import type { PropertySearchItem } from "@/types/api";

/** Use only recorded sales; an unavailable or withdrawn listing is not a sale. */
export async function getRecentSales(): Promise<PropertySearchItem[]> {
  const sales: PropertySearchItem[] = [];
  let page = 1;
  let loaded = 0;
  while (true) {
    const result = await searchProperties({ transaction: "vente", sort: "newest", page, pageSize: 100 });
    sales.push(...result.items.filter((item) => item.transaction === "vente" && item.status === "sold"));
    loaded += result.items.length;
    if (loaded >= result.total || result.items.length === 0) break;
    page += 1;
  }
  return sales;
}
