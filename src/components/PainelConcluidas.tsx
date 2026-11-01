"use client";

import { useEffect, useRef } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/_app";
import { DIAS_CURTOS } from "@/lib/constantes";
import { diaDaSemana, rotuloCurto } from "@/lib/datas";
import { IconeFechar, IconeReabrir } from "./Icones";

type Concluida = inferRouterOutputs<AppRouter>["tarefas"]["concluidas"][number];

const formatar = (d?: Date) =>
  d?.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

/**
 * Side drawer with the completed tasks.
 * Uses the native <dialog> with showModal(): focus is trapped inside,
 * Esc closes it and the background becomes inert, no modal library needed.
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
      // Clicking the dimmed backdrop (outside the content) closes the drawer.
      onClick={(e) => e.target === ref.current && onFechar()}
    >
      <div className="gaveta-conteudo">
        <header className="gaveta-topo">
          <div>
            <h2 id="titulo-concluidas">Completed</h2>
            <p className="subtitulo">
              {tarefas.length === 1 ? "1 task" : `${tarefas.length} tasks`}
            </p>
          </div>
          <button type="button" className="icone" onClick={onFechar} aria-label="Close drawer">
            <IconeFechar />
          </button>
        </header>

        {tarefas.length === 0 ? (
          <p className="gaveta-vazia">
            {carregando
              ? "Loading…"
              : "Nothing completed yet. Use the green button in the middle of a card to complete a task."}
          </p>
        ) : (
          <ul className="lista-concluidas">
            {tarefas.map((t) => (
              <li key={t.id} className={reabrindoId === t.id ? "saindo" : undefined}>
                <div>
                  <h3>{t.titulo}</h3>
                  {t.descricao && <p>{t.descricao}</p>}
                  <small>
                    Scheduled for {DIAS_CURTOS[diaDaSemana(t.data)]}, {rotuloCurto(t.data)}. Completed{" "}
                    {formatar(t.dataConclusao)}
                  </small>
                </div>
                <button
                  type="button"
                  className="icone"
                  title="Reopen"
                  aria-label={`Reopen "${t.titulo}"`}
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
