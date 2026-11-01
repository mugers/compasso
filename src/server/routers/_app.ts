import { router } from "../trpc";
import { tarefasRouter } from "./tarefas";

export const appRouter = router({
  tarefas: tarefasRouter,
});

// Exportamos apenas o *tipo* para o cliente: é isso que dá a tipagem
// ponta a ponta do tRPC sem levar código de servidor para o bundle.
export type AppRouter = typeof appRouter;
