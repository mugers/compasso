"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";
import { trpc } from "./client";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  // useState garante uma única instância por navegador (não recria a cada render).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Os dados vêm pré-carregados via SSR; evita refetch imediato na hidratação.
          queries: { staleTime: 5_000, retry: false },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
