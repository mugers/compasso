import { router } from "../trpc";
import { tarefasRouter } from "./tarefas";

export const appRouter = router({
  tarefas: tarefasRouter,
});

// Only the *type* is exported to the client: that is what gives tRPC its
// end-to-end typing without shipping server code to the browser bundle.
export type AppRouter = typeof appRouter;
