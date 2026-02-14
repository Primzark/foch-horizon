import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import Layout from "@/components/layout/Layout";
import PropertyCard from "@/components/property/PropertyCard";
import SearchBar from "@/components/property/SearchBar";
import { properties, cities } from "@/data/mock-data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ListingsPageProps {
  transactionType: "buy" | "rent";
}

const ListingsPage = ({ transactionType }: ListingsPageProps) => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = properties.filter(p => p.transaction_type === transactionType && p.status !== "archived");
    const city = searchParams.get("city");
    if (city) result = result.filter(p => p.city.toLowerCase().includes(city.toLowerCase()));
    
    const priceMax = searchParams.get("price_max");
    if (priceMax && priceMax !== "any") result = result.filter(p => p.price <= parseInt(priceMax));

    switch (sortBy) {
      case "price_asc": result.sort((a, b) => a.price - b.price); break;
      case "price_desc": result.sort((a, b) => b.price - a.price); break;
      case "surface": result.sort((a, b) => b.surface_m2 - a.surface_m2); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [transactionType, searchParams, sortBy]);

  const title = transactionType === "buy" ? "Acheter" : "Louer";

  return (
    <Layout>
      <div className="border-b border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl font-bold text-foreground">{title} un bien</h1>
          <p className="mt-1 text-muted-foreground">
            {filtered.length} bien{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}
          </p>
          <div className="mt-6">
            <SearchBar variant="compact" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filtres
          </Button>
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Plus récents</SelectItem>
                <SelectItem value="price_asc">Prix croissant</SelectItem>
                <SelectItem value="price_desc">Prix décroissant</SelectItem>
                <SelectItem value="surface">Surface</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden gap-1 md:flex">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("rounded-md p-2", viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("rounded-md p-2", viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-muted-foreground">Aucun bien ne correspond à vos critères.</p>
            <p className="mt-2 text-sm text-muted-foreground">Essayez d'élargir votre recherche.</p>
          </div>
        ) : (
          <div className={cn(
            viewMode === "grid"
              ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-4"
          )}>
            {filtered.map(property => (
              <PropertyCard key={property.id} property={property} variant={viewMode} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ListingsPage;
