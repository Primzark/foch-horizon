import { cityById } from "@/features/cities/data/cities";
import type { PropertySearchItem } from "@/types/api";
import type { Property } from "@/types/domain";

export function toSearchItem(property: Property): PropertySearchItem {
  const city = cityById.get(property.cityId);
  const imageUrls = [...property.images]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((image) => image.sourceUrl)
    .filter(Boolean);

  return {
    id: property.id,
    title: property.title,
    slug: property.slug,
    transaction: property.transactionType,
    type: property.propertyType,
    priceAmount: property.priceAmount,
    currency: property.priceCurrency,
    surfaceM2: property.surfaceM2,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parking: property.parkingCount,
    garage: property.garageCount,
    city: {
      name: city?.name ?? "",
      slug: city?.slug ?? "",
      postalCode: property.postalCode,
    },
    coverImageUrl: imageUrls[0] ?? "",
    imageUrls,
    dpeLabel: property.dpeLabel,
    status: property.status,
    sourceStatus: property.sourceStatus ?? null,
  };
}
