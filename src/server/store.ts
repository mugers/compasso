import { randomUUID } from "node:crypto";
import { hojeISO, inicioDaSemana, somarDias } from "@/lib/datas";

export type Tarefa = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: Date;
  /** Scheduled day, "YYYY-MM-DD". Allows planning weeks and months ahead. */
  data: string;
  /** Completed tasks leave the planner and show up in the completed list. */
  concluida: boolean;
  dataConclusao?: Date;
};

/**
 * In-memory "database".
 *
 * Decision: the array lives on `globalThis` so it survives Next's hot reload
 * in development (every recompile re-evaluates modules and, without this, the
 * list would be wiped on each code change). Restarting the process clears
 * everything — the challenge does not require persistence.
 *
 * The array order defines the order of the cards within each day.
 */
const globalStore = globalThis as unknown as { __tarefasV5?: Tarefa[] };

function seed(): Tarefa[] {
  // Dates relative to this week's Monday, so the sample data always falls in
  // the current week, the next one and the following month.
  const segunda = inicioDaSemana(hojeISO());
  const exemplos: [string, string | undefined, number, boolean?][] = [
    ["Plan the week", "Review priorities and schedule", 0],
    ["Team meeting", "Sync at 10am", 0],
    ["Reply to emails", undefined, 0],
    ["Review pull requests", "Client X project", 1],
    ["Gym", undefined, 1],
    ["Write documentation", "README and tRPC comments", 2],
    ["Call the bank", undefined, 2],
    ["Deploy to staging", "Validate with the QA team", 3],
    ["Study Next.js", "Server Components and caching", 3],
    ["Retrospective", "What worked and what did not", 4],
    ["Happy hour", undefined, 4],
    ["Grocery shopping", "Fruit, vegetables and coffee", 5],
    ["Rest", undefined, 6],
    // Future: next week and beyond
    ["Present quarterly results", "Slides with October metrics", 8],
    ["Medical checkup", "Bring test results", 10],
    ["Renew passport", undefined, 16],
    ["Ana's birthday", "Buy a gift beforehand", 24],
    // Already completed
    ["Send monthly report", "Final version for the board", 0, true],
    ["Book dentist appointment", undefined, 1, true],
  ];
  const agora = Date.now();
  return exemplos.map(([titulo, descricao, offset, concluida = false], i) => ({
    id: randomUUID(),
    titulo,
    descricao,
    data: somarDias(segunda, offset),
    dataCriacao: new Date(agora - (exemplos.length - i) * 60_000),
    concluida,
    dataConclusao: concluida ? new Date(agora - (exemplos.length - i) * 30_000) : undefined,
  }));
}

export const tarefas: Tarefa[] = (globalStore.__tarefasV5 ??= seed());

export function novoId() {
  return randomUUID();
}
