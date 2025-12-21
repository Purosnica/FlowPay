"use client";

import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/contexts/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            gcTime: 5 * 60 * 1000, // 5 minutos (antes cacheTime)
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              // No reintentar en errores 4xx
              if (error && typeof error === "object" && "statusCode" in error) {
                const statusCode = (error as { statusCode?: number }).statusCode;
                if (statusCode && statusCode >= 400 && statusCode < 500) {
                  return false;
                }
              }
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false, // No reintentar mutaciones por defecto
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" attribute="class">
        <AuthProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
