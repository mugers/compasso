// Kept outside "use client" files: values exported from a client module become
// "client references" when imported into Server Components.

/** Day names, from Monday (index 0) to Sunday (6). */
export const DIAS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const DIAS_CURTOS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const TAMANHO_PAGINA = 10;

/**
 * Moves a task to date `data`, at the given `posicao` within that day
 * (counted without the task itself; omitted = end of the day). Pure function,
 * used on the server (`mover` mutation) and on the client (optimistic
 * drag-and-drop update), so both sides compute exactly the same order.
 *
 * The order of tasks within each day is the array order itself.
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
    resto.push(movida); // end of the day
  }
  return resto;
}
