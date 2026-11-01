import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { novoId, tarefas, type Tarefa } from "../store";
import { moverTarefa } from "@/lib/constantes";
import { ehDataValida, hojeISO } from "@/lib/datas";

// Schemas reaproveitados entre as procedures.
const titulo = z
  .string({ error: "O título é obrigatório" })
  .trim()
  .min(1, "O título é obrigatório")
  .max(100, "O título deve ter no máximo 100 caracteres");

const descricao = z
  .string()
  .trim()
  .max(500, "A descrição deve ter no máximo 500 caracteres")
  .optional()
  // String vazia vira "sem descrição".
  .transform((v) => (v ? v : undefined));

const id = z.string().min(1, "Id inválido");

const data = z
  .string({ error: "Informe a data" })
  .refine(ehDataValida, "Data inválida (use AAAA-MM-DD)");

function buscarOuFalhar(tarefaId: string): Tarefa {
  const tarefa = tarefas.find((t) => t.id === tarefaId);
  if (!tarefa) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Tarefa com id "${tarefaId}" não encontrada`,
    });
  }
  return tarefa;
}

/** Substitui o conteúdo do store mantendo a mesma referência de array. */
function substituirTudo(novas: Tarefa[]) {
  tarefas.splice(0, tarefas.length, ...novas);
}

/**
 * Move considerando só as tarefas abertas (as que aparecem no planejador).
 * Sem isso, concluídas "invisíveis" no meio do dia deslocariam a posição.
 */
function moverNoQuadro(tarefaId: string, novaData: string, posicao?: number) {
  const abertas = tarefas.filter((t) => !t.concluida);
  const concluidas = tarefas.filter((t) => t.concluida);
  substituirTudo([...moverTarefa(abertas, tarefaId, novaData, posicao), ...concluidas]);
}

/** Abertas ordenadas por data; dentro do mesmo dia, mantém a ordem do quadro. */
function abertasPorData() {
  return tarefas
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !t.concluida)
    .sort((a, b) => a.t.data.localeCompare(b.t.data) || a.i - b.i)
    .map(({ t }) => t);
}

export const tarefasRouter = router({
  /**
   * Todas as tarefas abertas, na ordem do quadro. O cliente filtra pelo
   * período visível (semana ou mês): com dados em memória e poucos itens,
   * uma única query mantém a troca de período instantânea.
   */
  quadro: publicProcedure.query(() => tarefas.filter((t) => !t.concluida)),

  /**
   * Listagem paginada por cursor (offset), em ordem de data.
   * Alimenta o modo Lista com infinite scroll.
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

  /** Concluídas, da mais recente para a mais antiga. */
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
      tarefas.push(tarefa); // entra no fim do dia
      return tarefa;
    }),

  atualizar: publicProcedure
    .input(z.object({ id, titulo, descricao, data: data.optional() }))
    .mutation(({ input }) => {
      const tarefa = buscarOuFalhar(input.id);
      tarefa.titulo = input.titulo;
      tarefa.descricao = input.descricao;
      // Mudou a data pelo formulário: vai para o fim do novo dia.
      if (input.data !== undefined && input.data !== tarefa.data) {
        tarefa.data = input.data;
        moverNoQuadro(tarefa.id, input.data);
      }
      return buscarOuFalhar(input.id);
    }),

  /** Drag-and-drop / teclado: move para `data`, na `posicao` dentro do dia. */
  mover: publicProcedure
    .input(z.object({ id, data, posicao: z.number().int().min(0).optional() }))
    .mutation(({ input }) => {
      if (buscarOuFalhar(input.id).concluida) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tarefas concluídas não podem ser movidas" });
      }
      moverNoQuadro(input.id, input.data, input.posicao);
      return buscarOuFalhar(input.id);
    }),

  concluir: publicProcedure.input(z.object({ id })).mutation(({ input }) => {
    const tarefa = buscarOuFalhar(input.id);
    if (tarefa.concluida) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Esta tarefa já foi concluída" });
    }
    tarefa.concluida = true;
    tarefa.dataConclusao = new Date();
    return tarefa;
  }),

  /** Devolve a tarefa ao planejador, no fim do dia dela. */
  reabrir: publicProcedure.input(z.object({ id })).mutation(({ input }) => {
    const tarefa = buscarOuFalhar(input.id);
    if (!tarefa.concluida) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Esta tarefa já está aberta" });
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
        message: `Tarefa com id "${input.id}" não encontrada (talvez já tenha sido removida)`,
      });
    }
    const [removida] = tarefas.splice(indice, 1);
    return removida;
  }),
});
