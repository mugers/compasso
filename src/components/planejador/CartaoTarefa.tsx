"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { IconeConcluir, IconeLapis, IconeLixeira } from "../Icones";
import type { Tarefa } from "./tipos";

export type PropsCartao = {
  tarefa: Tarefa;
  /** "card" no quadro semanal; "linha" no modo lista. */
  variante?: "card" | "linha";
  excluindo?: boolean;
  /** Tela de exclusão aberta para este card (borda vermelha). */
  marcadoParaExcluir?: boolean;
  arrastando?: boolean;
  onIniciarArraste?: (e: DragEvent<HTMLElement>) => void;
  onEncerrarArraste?: () => void;
  /** Alt + setas. dx = dias, dy = posição dentro do dia. */
  onMoverTeclado?: (dx: number, dy: number) => void;
  /** Texto da dica mostrada no card selecionado. */
  dicaMover?: string;
  onConcluir: () => void;
  onExcluir: () => void;
  onSalvarDescricao: (texto: string) => void;
};

/**
 * Card de tarefa, compartilhado entre o quadro semanal e a lista.
 *
 * Selecionado (clique ou Tab), aceita atalhos:
 * - digitar: começa a editar a descrição, já com o caractere digitado;
 * - Del/Backspace: abre a tela de exclusão;
 * - Alt + setas: move (quando a visão suporta).
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
  dicaMover = "Alt + setas move",
  onConcluir,
  onExcluir,
  onSalvarDescricao,
}: PropsCartao) {
  const ref = useRef<HTMLElement>(null);
  // Texto em edição (null = não está editando). A ref espelha o estado para
  // que Enter seguido do blur não salve duas vezes.
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
    // Só quando o próprio card está focado: Espaço/Enter num botão interno
    // devem acionar o botão, não começar a digitar.
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
            aria-label={`Descrição de "${t.titulo}"`}
            placeholder="Descrição"
            onFocus={(e) => {
              // Cursor no fim (depois do caractere que abriu a edição).
              const fim = e.currentTarget.value.length;
              e.currentTarget.setSelectionRange(fim, fim);
            }}
            onChange={(e) => setEdicao(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation(); // teclas do texto não viram atalhos do card
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
        {/* span (não <p>): a regra `.card p` da descrição sobrescreveria o display:none. */}
        <span className="dica-card" aria-hidden>
          {editando
            ? "Enter salva, Shift + Enter quebra linha, Esc cancela"
            : `Digite para descrever. ${onMoverTeclado ? `${dicaMover}, ` : ""}Del exclui`}
        </span>
      </div>

      {/* Três ações do mesmo tamanho; "Concluir" fica exatamente no centro. */}
      <div className="acoes">
        <Link
          href={`/tarefas/${t.id}/editar`}
          className="icone"
          title="Editar"
          aria-label={`Editar "${t.titulo}"`}
        >
          <IconeLapis />
        </Link>
        <button
          type="button"
          className="icone icone-concluir"
          title="Concluir"
          aria-label={`Concluir "${t.titulo}"`}
          onClick={onConcluir}
        >
          <IconeConcluir />
        </button>
        <button
          type="button"
          className="icone icone-perigo"
          title="Excluir"
          aria-label={`Excluir "${t.titulo}"`}
          onClick={onExcluir}
        >
          <IconeLixeira />
        </button>
      </div>
    </article>
  );
}
