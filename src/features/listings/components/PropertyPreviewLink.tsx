import { Link, useLocation, type LinkProps } from "react-router-dom";
import type { PropertySearchItem } from "@/types/api";
import { toCanonicalPropertyPath } from "@/features/listings/utils/formatting";
import { createPropertyModalRouteState } from "@/features/listings/navigation/propertyModalNavigation";

interface PropertyPreviewLinkProps extends Omit<LinkProps, "to" | "state"> {
  item: PropertySearchItem;
  browseItems?: PropertySearchItem[];
}

export function PropertyPreviewLink({ item, browseItems, ...linkProps }: PropertyPreviewLinkProps) {
  const location = useLocation();

  return (
    <Link
      {...linkProps}
      to={toCanonicalPropertyPath(item)}
      state={createPropertyModalRouteState(location, item, browseItems)}
    />
  );
}
