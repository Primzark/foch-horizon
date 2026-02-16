import { cityById } from "@/features/cities/data/cities";
import type { PropertySearchItem } from "@/types/api";
import type { Property } from "@/types/domain";

export function toSearchItem(property: Property): PropertySearchItem {
  const city = cityById.get(property.cityId);

  return {
    id: property.id,
    title: property.title,
    slug: property.slug,
    transaction: property.transactionType,
    type: property.propertyType,
    priceAmount: property.priceAmount,
    currency: property.priceCurrency,
    surfaceM2: property.surfaceM2,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parking: property.parkingCount,
    garage: property.garageCount,
    city: {
      name: city?.name ?? "",
      slug: city?.slug ?? "",
      postalCode: property.postalCode,
    },
    coverImageUrl: property.images[0]?.sourceUrl ?? "",
    dpeLabel: property.dpeLabel,
    status: property.status,
  };
}
