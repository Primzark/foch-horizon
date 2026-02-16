import type { ReactNode } from "react";
import { AppFooter } from "@/layout/AppFooter";
import { AppHeader } from "@/layout/AppHeader";
import { SearchDrawer } from "@/features/listings/components/SearchDrawer";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main>{children}</main>
      <AppFooter />
      <SearchDrawer />
    </div>
  );
}
