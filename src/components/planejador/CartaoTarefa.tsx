"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { IconeConcluir, IconeLapis, IconeLixeira } from "../Icones";
import type { Tarefa } from "./tipos";

export type PropsCartao = {
  tarefa: Tarefa;
  /** "card" on the weekly board; "linha" (row) in the list view. */
  variante?: "card" | "linha";
  excluindo?: boolean;
  /** Delete dialog open for this card (red border). */
  marcadoParaExcluir?: boolean;
  arrastando?: boolean;
  onIniciarArraste?: (e: DragEvent<HTMLElement>) => void;
  onEncerrarArraste?: () => void;
  /** Alt + arrows. dx = days, dy = position within the day. */
  onMoverTeclado?: (dx: number, dy: number) => void;
  /** Hint text shown on the selected card. */
  dicaMover?: string;
  onConcluir: () => void;
  onExcluir: () => void;
  onSalvarDescricao: (texto: string) => void;
};

/**
 * Task card, shared by the weekly board and the list.
 *
 * When selected (click or Tab) it accepts shortcuts:
 * - typing: starts editing the description, beginning with the typed key;
 * - Del/Backspace: opens the delete dialog;
 * - Alt + arrows: moves the card (when the view supports it).
 */
export function CartaoTarefa({
  tarefa: t,
  variante = "card",
  excluindo,
  marcadoParaExcluir,
  arrastando,
  onIniciarArraste,
  onEncerrarArraste,
  onMoverTeclado,
  dicaMover = "Alt + arrows move it",
  onConcluir,
  onExcluir,
  onSalvarDescricao,
}: PropsCartao) {
  const ref = useRef<HTMLElement>(null);
  // Text being edited (null = not editing). The ref mirrors the state so
  // Enter followed by blur does not save twice.
  const [edicao, setEdicao] = useState<string | null>(null);
  const edicaoRef = useRef(edicao);
  edicaoRef.current = edicao;

  function encerrarEdicao(salvar: boolean, devolverFoco = true) {
    const texto = edicaoRef.current;
    if (texto === null) return;
    edicaoRef.current = null;
    setEdicao(null);
    if (salvar && texto.trim() !== (t.descricao ?? "")) onSalvarDescricao(texto);
    if (devolverFoco) requestAnimationFrame(() => ref.current?.focus());
  }

  function aoTeclar(e: KeyboardEvent) {
    const ehCaractere = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    // Only when the card itself has focus: Space/Enter on an inner button
    // must trigger that button, not start typing.
    if (ehCaractere && e.target === e.currentTarget) {
      e.preventDefault();
      setEdicao((t.descricao ? `${t.descricao} ` : "") + e.key);
      return;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && !e.altKey) {
      e.preventDefault();
      onExcluir();
      return;
    }
    if (!e.altKey || !onMoverTeclado) return;
    const direcoes: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const d = direcoes[e.key];
    if (!d) return;
    e.preventDefault();
    onMoverTeclado(d[0], d[1]);
  }

  const editando = edicao !== null;
  const classes = [
    "card",
    variante === "linha" && "card-linha",
    arrastando && "card-arrastando",
    excluindo && "card-excluindo",
    marcadoParaExcluir && "card-confirmando",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      ref={ref}
      data-card={t.id}
      tabIndex={0}
      aria-label={t.titulo}
      aria-describedby="atalhos-card"
      className={classes}
      draggable={Boolean(onIniciarArraste) && !excluindo && !marcadoParaExcluir && !editando}
      onDragStart={onIniciarArraste}
      onDragEnd={onEncerrarArraste}
      onKeyDown={aoTeclar}
    >
      <div className="card-texto">
        <h3>{t.titulo}</h3>
        {editando ? (
          <textarea
            className="descricao-inline"
            autoFocus
            value={edicao}
            maxLength={500}
            rows={2}
            aria-label={`Description of "${t.titulo}"`}
            placeholder="Description"
            onFocus={(e) => {
              // Cursor at the end (after the key that started the edit).
              const fim = e.currentTarget.value.length;
              e.currentTarget.setSelectionRange(fim, fim);
            }}
            onChange={(e) => setEdicao(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation(); // keys typed in the text are not card shortcuts
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                encerrarEdicao(true);
              } else if (e.key === "Escape") {
                e.preventDefault();
                encerrarEdicao(false);
              }
            }}
            onBlur={() => encerrarEdicao(true, false)}
          />
        ) : (
          t.descricao && <p>{t.descricao}</p>
        )}
        {/* span (not <p>): the description's `.card p` rule would override display:none. */}
        <span className="dica-card" aria-hidden>
          {editando
            ? "Enter saves, Shift + Enter adds a line, Esc cancels"
            : `Type to describe. ${onMoverTeclado ? `${dicaMover}, ` : ""}Del deletes`}
        </span>
      </div>

      {/* Three same-size actions; "Complete" sits exactly in the center. */}
      <div className="acoes">
        <Link
          href={`/tarefas/${t.id}/editar`}
          className="icone"
          title="Edit"
          aria-label={`Edit "${t.titulo}"`}
        >
          <IconeLapis />
        </Link>
        <button
          type="button"
          className="icone icone-concluir"
          title="Complete"
          aria-label={`Complete "${t.titulo}"`}
          onClick={onConcluir}
        >
          <IconeConcluir />
        </button>
        <button
          type="button"
          className="icone icone-perigo"
          title="Delete"
          aria-label={`Delete "${t.titulo}"`}
          onClick={onExcluir}
        >
          <IconeLixeira />
        </button>
      </div>
    </article>
  );
}
