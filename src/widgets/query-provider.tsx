"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Propósito: Expone un QueryClient por árbol para cachear lecturas del BFF.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  /**
   * Output:
   * @returns JSX.Element — Provider de TanStack Query
   */
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
