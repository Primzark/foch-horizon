import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  variant?: "hero" | "compact";
  className?: string;
}

const SearchBar = ({ variant = "hero", className }: SearchBarProps) => {
  const navigate = useNavigate();
  const [transactionType, setTransactionType] = useState<"buy" | "rent">("buy");
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (propertyType) params.set("type", propertyType);
    if (priceMax) params.set("price_max", priceMax);
    navigate(`/${transactionType}?${params.toString()}`);
  };

  const isHero = variant === "hero";

  return (
    <div className={cn("w-full", className)}>
      {/* Toggle */}
      <div className={cn("mb-4 flex gap-1", isHero ? "justify-center" : "justify-start")}>
        <button
          onClick={() => setTransactionType("buy")}
          className={cn(
            "rounded-full px-6 py-2 text-sm font-semibold transition-all",
            transactionType === "buy"
              ? "bg-accent text-accent-foreground shadow-gold"
              : isHero
              ? "bg-card/20 text-primary-foreground/80 hover:bg-card/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Acheter
        </button>
        <button
          onClick={() => setTransactionType("rent")}
          className={cn(
            "rounded-full px-6 py-2 text-sm font-semibold transition-all",
            transactionType === "rent"
              ? "bg-accent text-accent-foreground shadow-gold"
              : isHero
              ? "bg-card/20 text-primary-foreground/80 hover:bg-card/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Louer
        </button>
      </div>

      {/* Fields */}
      <div
        className={cn(
          "flex flex-col gap-3 md:flex-row md:items-end",
          isHero && "rounded-xl bg-card/95 p-4 shadow-lg backdrop-blur-md md:p-5"
        )}
      >
        <div className="flex-1">
          <label className={cn("mb-1.5 block text-xs font-medium", isHero ? "text-muted-foreground" : "text-muted-foreground")}>
            Ville ou quartier
          </label>
          <Input
            placeholder="Le Havre, Sainte-Adresse…"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="w-full md:w-40">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Type de bien</label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Tous types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="appartement">Appartement</SelectItem>
              <SelectItem value="maison">Maison</SelectItem>
              <SelectItem value="villa">Villa</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="terrain">Terrain</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-36">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Budget max</label>
          <Select value={priceMax} onValueChange={setPriceMax}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Sans limite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Sans limite</SelectItem>
              {transactionType === "buy" ? (
                <>
                  <SelectItem value="150000">150 000 €</SelectItem>
                  <SelectItem value="250000">250 000 €</SelectItem>
                  <SelectItem value="400000">400 000 €</SelectItem>
                  <SelectItem value="600000">600 000 €</SelectItem>
                  <SelectItem value="1000000">1 000 000 €</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="500">500 €/mois</SelectItem>
                  <SelectItem value="700">700 €/mois</SelectItem>
                  <SelectItem value="1000">1 000 €/mois</SelectItem>
                  <SelectItem value="1500">1 500 €/mois</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleSearch}
          className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-gold gap-2 md:px-8"
          size="lg"
        >
          <Search className="h-4 w-4" />
          Rechercher
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;
