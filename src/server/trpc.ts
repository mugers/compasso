import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

/**
 * tRPC initialization.
 *
 * - superjson: lets `Date` values (dataCriacao) travel between server and
 *   client as real dates instead of strings.
 * - errorFormatter: when the failure comes from Zod validation, replaces the
 *   message (by default a JSON dump of every issue) with the first readable
 *   one, e.g. "Title is required". The frontend then only needs to show
 *   `error.message`.
 */
const t = initTRPC.create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.cause instanceof ZodError) {
      return {
        ...shape,
        message: error.cause.issues[0]?.message ?? "Invalid data",
      };
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
