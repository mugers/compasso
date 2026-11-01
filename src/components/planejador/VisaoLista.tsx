"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { DIAS } from "@/lib/constantes";
import { TAMANHO_PAGINA } from "@/lib/constantes";
import { diaDaSemana, diferencaEmDias, rotuloLongo } from "@/lib/datas";
import { trpc } from "@/trpc/client";
import type { PropsCartao } from "./CartaoTarefa";
import type { Saidas, Tarefa } from "./tipos";

/** "Today", "Tomorrow", "Yesterday", "In 5 days", "3 days ago". */
function distancia(data: string, hoje: string) {
  const n = diferencaEmDias(hoje, data);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

/**
 * Tasks in date order, grouped by day.
 *
 * Infinite scroll: the first page comes from the server (SSR) and the next
 * ones are fetched through `tarefas.listar` (cursor pagination) when the
 * sentinel at the end of the list enters the viewport.
 */
export function VisaoLista({
  inicial,
  hoje,
  renderCartao,
}: {
  inicial: Saidas["listar"];
  hoje: string;
  renderCartao: (t: Tarefa, extras: Partial<PropsCartao>) => ReactNode;
}) {
  const lista = trpc.tarefas.listar.useInfiniteQuery(
    { limit: TAMANHO_PAGINA },
    {
      getNextPageParam: (ultima) => ultima.nextCursor,
      initialData: { pages: [inicial], pageParams: [null] },
    },
  );

  const sentinela = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = lista;
  useEffect(() => {
    const el = sentinela.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const tarefas = lista.data?.pages.flatMap((p) => p.itens) ?? [];
  const total = lista.data?.pages[0]?.total ?? 0;

  // Groups while keeping the order (already sorted by date on the server).
  const grupos: { data: string; itens: Tarefa[] }[] = [];
  for (const t of tarefas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.data === t.data) ultimo.itens.push(t);
    else grupos.push({ data: t.data, itens: [t] });
  }

  if (tarefas.length === 0) {
    return <p className="status">No open tasks. Create one with the "New task" button.</p>;
  }

  return (
    <div className="lista">
      {grupos.map(({ data, itens }) => (
        <section
          key={data}
          className={`grupo${data === hoje ? " grupo-hoje" : ""}${data < hoje ? " grupo-passou" : ""}`}
          aria-labelledby={`grupo-${data}`}
        >
          <header className="grupo-topo">
            <h2 id={`grupo-${data}`}>
              {DIAS[diaDaSemana(data)]}, {rotuloLongo(data, Number(hoje.slice(0, 4)))}
            </h2>
            <span className="grupo-distancia">{distancia(data, hoje)}</span>
          </header>
          <div className="grupo-itens">
            {itens.map((t) => (
              <div key={t.id}>{renderCartao(t, { variante: "linha" })}</div>
            ))}
          </div>
        </section>
      ))}

      <div ref={sentinela} />
      <p className="status" aria-live="polite">
        {isFetchingNextPage
          ? "Loading more tasks…"
          : hasNextPage
            ? `Showing ${tarefas.length} of ${total}`
            : `All ${total} tasks loaded`}
      </p>
      {lista.isError && (
        <p className="status">
          Couldn't load more tasks.{" "}
          <button type="button" className="btn" onClick={() => fetchNextPage()}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}
