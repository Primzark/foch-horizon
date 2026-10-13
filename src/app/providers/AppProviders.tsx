import { ReactNode, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { ThemeProvider } from "next-themes";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

function PropertyStatusRealtimeInvalidator() {
  const queryClient = useQueryClient();
  const supabaseClient = useMemo(() => getBrowserSupabaseClient(), []);

  useEffect(() => {
    if (!supabaseClient) return;

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabaseClient
      .channel("public-property-status-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "properties" }, () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          void queryClient.invalidateQueries({
            predicate: ({ queryKey }) => {
              const key = queryKey[0];
              return typeof key === "string" && [
                "admin-properties",
                "properties",
                "property",
                "property-compare",
                "property-detail-navigation-page",
                "similar",
                "city-properties",
                "featured-properties",
                "main-search-inventory",
                "geography-area-property-counts",
                "budget-finder",
                "recent-sales",
              ].includes(key);
            },
          });
        }, 300);
      })
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabaseClient.removeChannel(channel);
    };
  }, [queryClient, supabaseClient]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="foch-theme">
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <PropertyStatusRealtimeInvalidator />
            {children}
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
