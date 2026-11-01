"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { DIAS } from "@/lib/constantes";
import { TAMANHO_PAGINA } from "@/lib/constantes";
import { diaDaSemana, diferencaEmDias, rotuloLongo } from "@/lib/datas";
import { trpc } from "@/trpc/client";
import type { PropsCartao } from "./CartaoTarefa";
import type { Saidas, Tarefa } from "./tipos";

/** "Hoje", "Amanhã", "Ontem", "Em 5 dias", "Há 3 dias". */
function distancia(data: string, hoje: string) {
  const n = diferencaEmDias(hoje, data);
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  if (n === -1) return "Ontem";
  return n > 0 ? `Em ${n} dias` : `Há ${-n} dias`;
}

/**
 * Lista de tarefas em ordem de data, agrupadas por dia.
 *
 * Infinite scroll: a primeira página vem do servidor (SSR) e as próximas
 * são buscadas via `tarefas.listar` (paginação por cursor) quando o
 * sentinela no fim da lista entra na tela.
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

  // Agrupa preservando a ordem (já vem ordenada por data do servidor).
  const grupos: { data: string; itens: Tarefa[] }[] = [];
  for (const t of tarefas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.data === t.data) ultimo.itens.push(t);
    else grupos.push({ data: t.data, itens: [t] });
  }

  if (tarefas.length === 0) {
    return <p className="status">Nenhuma tarefa aberta. Crie uma pelo botão "Nova tarefa".</p>;
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
          ? "Carregando mais tarefas…"
          : hasNextPage
            ? `Mostrando ${tarefas.length} de ${total}`
            : `Todas as ${total} tarefas carregadas`}
      </p>
      {lista.isError && (
        <p className="status">
          Não foi possível carregar mais tarefas.{" "}
          <button type="button" className="btn" onClick={() => fetchNextPage()}>
            Tentar de novo
          </button>
        </p>
      )}
    </div>
  );
}
