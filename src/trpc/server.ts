import "server-only";
import { createCallerFactory } from "@/server/trpc";
import { appRouter } from "@/server/routers/_app";

/**
 * Caller for Server Components (SSR).
 * Calls the procedures directly, without going through HTTP — same code,
 * same validation, zero network round-trip.
 */
export const api = createCallerFactory(appRouter)({});
