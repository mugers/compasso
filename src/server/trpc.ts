import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

/**
 * Inicialização do tRPC.
 *
 * - superjson: permite trafegar `Date` (dataCriacao) entre servidor e cliente
 *   sem virar string.
 * - errorFormatter: quando a falha vem da validação do Zod, troca a mensagem
 *   (que por padrão é um JSON com todos os issues) pela primeira mensagem
 *   legível, ex.: "O título é obrigatório". Assim o frontend só precisa exibir
 *   `error.message`.
 */
const t = initTRPC.create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.cause instanceof ZodError) {
      return {
        ...shape,
        message: error.cause.issues[0]?.message ?? "Dados inválidos",
      };
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
