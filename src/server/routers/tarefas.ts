import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { novoId, tarefas, type Tarefa } from "../store";
import { moverTarefa } from "@/lib/constantes";
import { ehDataValida, hojeISO } from "@/lib/datas";

// Schemas shared across procedures.
const titulo = z
  .string({ error: "Title is required" })
  .trim()
  .min(1, "Title is required")
  .max(100, "Title must be at most 100 characters");

const descricao = z
  .string()
  .trim()
  .max(500, "Description must be at most 500 characters")
  .optional()
  // An empty string means "no description".
  .transform((v) => (v ? v : undefined));

const id = z.string().min(1, "Invalid id");

const data = z
  .string({ error: "Date is required" })
  .refine(ehDataValida, "Invalid date (use YYYY-MM-DD)");

function buscarOuFalhar(tarefaId: string): Tarefa {
  const tarefa = tarefas.find((t) => t.id === tarefaId);
  if (!tarefa) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Task with id "${tarefaId}" not found`,
    });
  }
  return tarefa;
}

/** Replaces the store contents while keeping the same array reference. */
function substituirTudo(novas: Tarefa[]) {
  tarefas.splice(0, tarefas.length, ...novas);
}

/**
 * Moves considering only open tasks (the ones shown in the planner).
 * Otherwise "invisible" completed tasks in the middle of a day would shift
 * the target position.
 */
function moverNoQuadro(tarefaId: string, novaData: string, posicao?: number) {
  const abertas = tarefas.filter((t) => !t.concluida);
  const concluidas = tarefas.filter((t) => t.concluida);
  substituirTudo([...moverTarefa(abertas, tarefaId, novaData, posicao), ...concluidas]);
}

/** Open tasks sorted by date; within the same day, keeps the board order. */
function abertasPorData() {
  return tarefas
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !t.concluida)
    .sort((a, b) => a.t.data.localeCompare(b.t.data) || a.i - b.i)
    .map(({ t }) => t);
}

export const tarefasRouter = router({
  /**
   * All open tasks, in board order. The client filters by the visible period
   * (week or month): with in-memory data and few items, a single query keeps
   * switching periods instant.
   */
  quadro: publicProcedure.query(() => tarefas.filter((t) => !t.concluida)),

  /**
   * Cursor-paginated (offset) listing, ordered by date.
   * Feeds the List view's infinite scroll.
   */
  listar: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
        cursor: z.number().int().min(0).nullish(),
      }),
    )
    .query(({ input }) => {
      const inicio = input.cursor ?? 0;
      const ordenadas = abertasPorData();
      const itens = ordenadas.slice(inicio, inicio + input.limit);
      const proximo = inicio + itens.length;
      return {
        itens,
        total: ordenadas.length,
        nextCursor: proximo < ordenadas.length ? proximo : null,
      };
    }),

  /** Completed tasks, most recent first. */
  concluidas: publicProcedure.query(() =>
    tarefas
      .filter((t) => t.concluida)
      .sort((a, b) => (b.dataConclusao?.getTime() ?? 0) - (a.dataConclusao?.getTime() ?? 0)),
  ),

  buscarPorId: publicProcedure
    .input(z.object({ id }))
    .query(({ input }) => buscarOuFalhar(input.id)),

  criar: publicProcedure
    .input(z.object({ titulo, descricao, data: data.optional() }))
    .mutation(({ input }) => {
      const tarefa: Tarefa = {
        id: novoId(),
        titulo: input.titulo,
        descricao: input.descricao,
        data: input.data ?? hojeISO(),
        dataCriacao: new Date(),
        concluida: false,
      };
      tarefas.push(tarefa); // goes to the end of its day
      return tarefa;
    }),

  atualizar: publicProcedure
    .input(z.object({ id, titulo, descricao, data: data.optional() }))
    .mutation(({ input }) => {
      const tarefa = buscarOuFalhar(input.id);
      tarefa.titulo = input.titulo;
      tarefa.descricao = input.descricao;
      // Date changed through the form: goes to the end of the new day.
      if (input.data !== undefined && input.data !== tarefa.data) {
        tarefa.data = input.data;
        moverNoQuadro(tarefa.id, input.data);
      }
      return buscarOuFalhar(input.id);
    }),

  /** Drag-and-drop / keyboard: moves to `data`, at `posicao` within that day. */
  mover: publicProcedure
    .input(z.object({ id, data, posicao: z.number().int().min(0).optional() }))
    .mutation(({ input }) => {
      if (buscarOuFalhar(input.id).concluida) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Completed tasks cannot be moved" });
      }
      moverNoQuadro(input.id, input.data, input.posicao);
      return buscarOuFalhar(input.id);
    }),

  concluir: publicProcedure.input(z.object({ id })).mutation(({ input }) => {
    const tarefa = buscarOuFalhar(input.id);
    if (tarefa.concluida) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This task is already completed" });
    }
    tarefa.concluida = true;
    tarefa.dataConclusao = new Date();
    return tarefa;
  }),

  /** Puts the task back in the planner, at the end of its day. */
  reabrir: publicProcedure.input(z.object({ id })).mutation(({ input }) => {
    const tarefa = buscarOuFalhar(input.id);
    if (!tarefa.concluida) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This task is already open" });
    }
    tarefa.concluida = false;
    tarefa.dataConclusao = undefined;
    moverNoQuadro(tarefa.id, tarefa.data);
    return tarefa;
  }),

  deletar: publicProcedure.input(z.object({ id })).mutation(({ input }) => {
    const indice = tarefas.findIndex((t) => t.id === input.id);
    if (indice === -1) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Task with id "${input.id}" not found (it may have been deleted already)`,
      });
    }
    const [removida] = tarefas.splice(indice, 1);
    return removida;
  }),
});
