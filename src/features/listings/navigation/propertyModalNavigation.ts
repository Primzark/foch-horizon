import type { Location } from "react-router-dom";
import type { PropertySearchItem, PropertySearchParams } from "@/types/api";

export interface PropertyModalRouteState {
  propertyModal?: boolean;
  backgroundLocation?: Location;
  propertyPreview?: PropertySearchItem;
  announcementItems?: PropertySearchItem[];
  budgetFinderFilters?: PropertySearchParams;
  propertyModalDepth?: number;
}

export function createPropertyModalRouteState(
  location: Location,
  propertyPreview?: PropertySearchItem,
  announcementItems?: PropertySearchItem[],
): PropertyModalRouteState {
  const currentState = location.state as PropertyModalRouteState | null;
  const backgroundLocation = currentState?.propertyModal && currentState.backgroundLocation
    ? currentState.backgroundLocation
    : location;
  const resolvedItems = announcementItems ?? currentState?.announcementItems;
  const propertyModalDepth = currentState?.propertyModal
    ? (currentState.propertyModalDepth ?? 0) + 1
    : 0;

  return {
    propertyModal: true,
    backgroundLocation,
    propertyModalDepth,
    ...(propertyPreview ? { propertyPreview } : {}),
    ...(resolvedItems ? { announcementItems: resolvedItems } : {}),
    ...(currentState?.budgetFinderFilters ? { budgetFinderFilters: currentState.budgetFinderFilters } : {}),
  };
}
