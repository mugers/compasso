import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";

export type Saidas = inferRouterOutputs<AppRouter>["tarefas"];
export type Tarefa = Saidas["quadro"][number];
export type Modo = "semana" | "mes" | "lista";

/** Switcher order. List comes first and is the default view. */
export const MODOS: { valor: Modo; rotulo: string }[] = [
  { valor: "lista", rotulo: "List" },
  { valor: "mes", rotulo: "Month" },
  { valor: "semana", rotulo: "Week" },
];

export const ehModo = (v: unknown): v is Modo => v === "semana" || v === "mes" || v === "lista";
