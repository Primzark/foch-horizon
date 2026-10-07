import type { Location } from "react-router-dom";
import type { PropertySearchItem, PropertySearchParams } from "@/types/api";

export interface PropertyModalRouteState {
  propertyModal?: boolean;
  backgroundLocation?: Location;
  propertyPreview?: PropertySearchItem;
  announcementItems?: PropertySearchItem[];
  announcementTotal?: number;
  announcementMode?: "selection" | "similar";
  announcementStartPage?: number;
  announcementEndPage?: number;
  announcementPageSize?: number;
  budgetFinderFilters?: PropertySearchParams;
  propertyModalDepth?: number;
}

export function createPropertyModalRouteState(
  location: Location,
  propertyPreview?: PropertySearchItem,
  announcementItems?: PropertySearchItem[],
  announcementTotal?: number,
  announcementMode?: "selection" | "similar",
): PropertyModalRouteState {
  const currentState = location.state as PropertyModalRouteState | null;
  const backgroundLocation = currentState?.propertyModal && currentState.backgroundLocation
    ? currentState.backgroundLocation
    : location;
  const resolvedItems = announcementItems ?? currentState?.announcementItems;
  const resolvedMode = announcementItems
    ? announcementMode ?? "selection"
    : currentState?.announcementMode;
  const resolvedTotal = announcementItems
    ? announcementTotal ?? announcementItems.length
    : announcementTotal ?? currentState?.announcementTotal;
  const propertyModalDepth = currentState?.propertyModal
    ? (currentState.propertyModalDepth ?? 0) + 1
    : 0;

  return {
    propertyModal: true,
    backgroundLocation,
    propertyModalDepth,
    ...(propertyPreview ? { propertyPreview } : {}),
    ...(resolvedItems ? { announcementItems: resolvedItems } : {}),
    ...(resolvedTotal != null ? { announcementTotal: resolvedTotal } : {}),
    ...(resolvedMode ? { announcementMode: resolvedMode } : {}),
    ...(resolvedMode === "selection" && currentState?.announcementMode !== "similar" ? {
      ...(currentState?.announcementStartPage != null ? { announcementStartPage: currentState.announcementStartPage } : {}),
      ...(currentState?.announcementEndPage != null ? { announcementEndPage: currentState.announcementEndPage } : {}),
      ...(currentState?.announcementPageSize != null ? { announcementPageSize: currentState.announcementPageSize } : {}),
    } : {}),
    ...(currentState?.budgetFinderFilters ? { budgetFinderFilters: currentState.budgetFinderFilters } : {}),
  };
}
