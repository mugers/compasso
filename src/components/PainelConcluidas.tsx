"use client";

import { useEffect, useRef } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";
import { DIAS_CURTOS } from "@/lib/constantes";
import { diaDaSemana, rotuloCurto } from "@/lib/datas";
import { IconeFechar, IconeReabrir } from "./Icones";

type Concluida = inferRouterOutputs<AppRouter>["tarefas"]["concluidas"][number];

const formatar = (d?: Date) =>
  d?.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

/**
 * Gaveta lateral com as tarefas concluídas.
 * Usa o <dialog> nativo com showModal(): foco preso dentro do painel,
 * Esc fecha e o fundo fica inerte, sem biblioteca de modal.
 */
export function PainelConcluidas({
  aberto,
  onFechar,
  tarefas,
  carregando,
  reabrindoId,
  onReabrir,
}: {
  aberto: boolean;
  onFechar: () => void;
  tarefas: Concluida[];
  carregando: boolean;
  reabrindoId?: string;
  onReabrir: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className="gaveta"
      aria-labelledby="titulo-concluidas"
      onClose={onFechar}
      // Clique no fundo escurecido (fora do conteúdo) fecha o painel.
      onClick={(e) => e.target === ref.current && onFechar()}
    >
      <div className="gaveta-conteudo">
        <header className="gaveta-topo">
          <div>
            <h2 id="titulo-concluidas">Concluídas</h2>
            <p className="subtitulo">
              {tarefas.length === 1 ? "1 tarefa" : `${tarefas.length} tarefas`}
            </p>
          </div>
          <button type="button" className="icone" onClick={onFechar} aria-label="Fechar painel">
            <IconeFechar />
          </button>
        </header>

        {tarefas.length === 0 ? (
          <p className="gaveta-vazia">
            {carregando
              ? "Carregando…"
              : "Nada concluído ainda. Use o botão verde no centro de um card para concluir uma tarefa."}
          </p>
        ) : (
          <ul className="lista-concluidas">
            {tarefas.map((t) => (
              <li key={t.id} className={reabrindoId === t.id ? "saindo" : undefined}>
                <div>
                  <h3>{t.titulo}</h3>
                  {t.descricao && <p>{t.descricao}</p>}
                  <small>
                    Marcada para {DIAS_CURTOS[diaDaSemana(t.data)].toLowerCase()}, {rotuloCurto(t.data)}. Concluída em{" "}
                    {formatar(t.dataConclusao)}
                  </small>
                </div>
                <button
                  type="button"
                  className="icone"
                  title="Reabrir"
                  aria-label={`Reabrir "${t.titulo}"`}
                  disabled={reabrindoId === t.id}
                  onClick={() => onReabrir(t.id)}
                >
                  <IconeReabrir />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
