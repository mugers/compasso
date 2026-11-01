import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";

export type Saidas = inferRouterOutputs<AppRouter>["tarefas"];
export type Tarefa = Saidas["quadro"][number];
export type Modo = "semana" | "mes" | "lista";

/** Ordem do seletor. A Lista vem primeiro e é o modo padrão. */
export const MODOS: { valor: Modo; rotulo: string }[] = [
  { valor: "lista", rotulo: "Lista" },
  { valor: "mes", rotulo: "Mês" },
  { valor: "semana", rotulo: "Semana" },
];

export const ehModo = (v: unknown): v is Modo => v === "semana" || v === "mes" || v === "lista";
