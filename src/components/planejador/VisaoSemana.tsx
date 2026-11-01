"use client";

import { useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { DIAS } from "@/lib/constantes";
import { diaDoMes, rotuloLongo, somarDias } from "@/lib/datas";
import { IconeMais } from "../Icones";
import type { PropsCartao } from "./CartaoTarefa";
import type { Tarefa } from "./tipos";

type Alvo = { data: string; posicao: number };
type Extras = Partial<PropsCartao>;

/**
 * Kanban board for one week (Monday to Sunday), with native HTML5
 * drag-and-drop, a drop-position marker and quick add per column.
 */
export function VisaoSemana({
  tarefas,
  dias,
  hoje,
  renderCartao,
  onMover,
  onCriar,
}: {
  tarefas: Tarefa[];
  /** The 7 dates of the visible week. */
  dias: string[];
  hoje: string;
  renderCartao: (t: Tarefa, extras: Extras) => ReactNode;
  onMover: (t: Tarefa, data: string, posicao?: number) => void;
  onCriar: (titulo: string, data: string) => Promise<unknown>;
}) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const [adicionando, setAdicionando] = useState<string | null>(null);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [criando, setCriando] = useState(false);
  // Enter on an empty field: warn instead of silently ignoring it.
  const [faltaTitulo, setFaltaTitulo] = useState(false);

  /** Works out where in the day the card would drop, from the mouse height. */
  function aoArrastarSobre(e: DragEvent<HTMLElement>, data: string) {
    if (!arrastando) return;
    e.preventDefault(); // required to allow the drop
    e.dataTransfer.dropEffect = "move";
    const cards = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>("[data-card]"),
    ).filter((el) => el.dataset.card !== arrastando);
    let posicao = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    if (posicao === -1) posicao = cards.length;
    if (alvo?.data !== data || alvo.posicao !== posicao) setAlvo({ data, posicao });
  }

  function aoSoltar(e: DragEvent) {
    e.preventDefault();
    const tarefa = tarefas.find((t) => t.id === arrastando);
    if (tarefa && alvo) onMover(tarefa, alvo.data, alvo.posicao);
    encerrarArraste();
  }

  function encerrarArraste() {
    setArrastando(null);
    setAlvo(null);
  }

  async function aoCriar(e: FormEvent, data: string) {
    e.preventDefault();
    if (criando) return;
    if (!novoTitulo.trim()) {
      setFaltaTitulo(true);
      return;
    }
    setCriando(true);
    try {
      await onCriar(novoTitulo, data);
      setNovoTitulo(""); // keeps the field open to add several in a row
    } catch {
      // the error is already shown in a toast by the parent
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="quadro">
      {dias.map((data, i) => {
        const nome = DIAS[i];
        // In the target column the dragged card is hidden so the position
        // marker lands on the right index.
        const doDia = tarefas.filter((t) => t.data === data);
        const visiveis = doDia.filter((t) => !(alvo?.data === data && t.id === arrastando));
        const ativa = alvo?.data === data;
        const ehHoje = data === hoje;
        const passou = data < hoje;
        const marcador = <div className="marcador" aria-hidden />;

        return (
          <section
            key={data}
            className={[
              "coluna",
              ativa && "coluna-ativa",
              ehHoje && "coluna-hoje",
              passou && "coluna-passou",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={(e) => aoArrastarSobre(e, data)}
            onDrop={aoSoltar}
            aria-labelledby={`dia-${data}`}
          >
            <header className="coluna-topo">
              <span className="data" aria-hidden>
                {diaDoMes(data)}
              </span>
              <h2 id={`dia-${data}`} aria-label={`${nome}, ${rotuloLongo(data)}`}>
                {nome}
                {ehHoje && <span className="hoje">hoje</span>}
              </h2>
              <span className="contador" aria-label={`${doDia.length} tarefas`}>
                {doDia.length}
              </span>
            </header>

            <div className="cards">
              {visiveis.map((t, indice) => (
                <div key={t.id} className="slot">
                  {ativa && alvo.posicao === indice && marcador}
                  {renderCartao(t, {
                    arrastando: t.id === arrastando,
                    onIniciarArraste: (e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", t.id);
                      setArrastando(t.id);
                    },
                    onEncerrarArraste: encerrarArraste,
                    // ←/→ change the day (crossing weeks); ↑/↓ reorder.
                    onMoverTeclado: (dx, dy) => {
                      if (dx) onMover(t, somarDias(data, dx), indice);
                      else if (indice + dy >= 0) onMover(t, data, indice + dy);
                    },
                  })}
                </div>
              ))}
              {ativa && alvo.posicao >= visiveis.length && marcador}

              {adicionando === data ? (
                <form className="adicao" onSubmit={(e) => aoCriar(e, data)}>
                  <input
                    autoFocus
                    value={novoTitulo}
                    onChange={(e) => {
                      setNovoTitulo(e.target.value);
                      setFaltaTitulo(false);
                    }}
                    aria-invalid={faltaTitulo}
                    aria-describedby={`dica-${data}`}
                    onKeyDown={(e) => e.key === "Escape" && setAdicionando(null)}
                    onBlur={() => !novoTitulo.trim() && setAdicionando(null)}
                    placeholder="Task title"
                    aria-label={`New task for ${nome}, ${rotuloLongo(data)}`}
                    maxLength={100}
                    // readOnly (not disabled) while saving: a disabled field
                    // loses focus, and the user could not type the next task
                    // right away.
                    readOnly={criando}
                    aria-busy={criando}
                  />
                  <span id={`dica-${data}`} className={faltaTitulo ? "dica erro-campo" : "dica"}>
                    {criando
                      ? "Adding…"
                      : faltaTitulo
                        ? "Type a title before pressing Enter"
                        : "Enter adds, Esc closes"}
                  </span>
                </form>
              ) : (
                <button
                  type="button"
                  className="adicionar"
                  onClick={() => {
                    setAdicionando(data);
                    setNovoTitulo("");
                    setFaltaTitulo(false);
                  }}
                >
                  <IconeMais /> Add
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
