// Fica fora dos arquivos "use client": valores exportados de um módulo de
// cliente viram "client references" quando importados em Server Components.

/** Nomes dos dias, de segunda (índice 0) a domingo (6). */
export const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;
export const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export const TAMANHO_PAGINA = 10;

/**
 * Move uma tarefa para a data `data`, na `posicao` indicada dentro daquele
 * dia (contada sem a própria tarefa; omitida = fim do dia). Função pura,
 * usada no servidor (mutation `mover`) e no cliente (atualização otimista do
 * drag-and-drop), garantindo que os dois lados calculem a mesma ordem.
 *
 * A ordem das tarefas dentro de cada dia é a própria ordem do array.
 */
export function moverTarefa<T extends { id: string; data: string }>(
  lista: T[],
  id: string,
  data: string,
  posicao = Infinity,
): T[] {
  const tarefa = lista.find((t) => t.id === id);
  if (!tarefa) return lista;

  const resto = lista.filter((t) => t.id !== id);
  const movida = { ...tarefa, data };
  const doDia = resto.filter((t) => t.data === data);
  const p = Math.max(0, Math.min(posicao, doDia.length));

  if (p < doDia.length) {
    resto.splice(resto.indexOf(doDia[p]), 0, movida);
  } else {
    resto.push(movida); // fim do dia
  }
  return resto;
}
