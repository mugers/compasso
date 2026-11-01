import "server-only";
import { createCallerFactory } from "@/server/trpc";
import { appRouter } from "@/server/routers/_app";

/**
 * Caller para Server Components (SSR).
 * Chama as procedures diretamente, sem passar por HTTP — mesmo código,
 * mesma validação, zero round-trip de rede.
 */
export const api = createCallerFactory(appRouter)({});
