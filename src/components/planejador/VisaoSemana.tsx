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
 * Quadro kanban de uma semana (segunda a domingo), com drag-and-drop nativo
 * do HTML5, marcador de posição e criação rápida por coluna.
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
  /** As 7 datas da semana visível. */
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
  // Enter com o campo vazio: avisa em vez de ignorar em silêncio.
  const [faltaTitulo, setFaltaTitulo] = useState(false);

  /** Descobre em que posição do dia o card seria solto, pela altura do mouse. */
  function aoArrastarSobre(e: DragEvent<HTMLElement>, data: string) {
    if (!arrastando) return;
    e.preventDefault(); // necessário para permitir o drop
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
      setNovoTitulo(""); // mantém o campo aberto para adicionar várias em sequência
    } catch {
      // o erro já é mostrado no aviso pelo componente pai
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="quadro">
      {dias.map((data, i) => {
        const nome = DIAS[i];
        // Na coluna-alvo, escondemos o card arrastado para o marcador
        // de posição ficar no índice certo.
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
                    // ←/→ trocam de dia (atravessando semanas); ↑/↓ reordenam.
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
                    placeholder="Título da tarefa"
                    aria-label={`Nova tarefa para ${nome.toLowerCase()}, ${rotuloLongo(data)}`}
                    maxLength={100}
                    // readOnly (e não disabled) enquanto salva: um campo
                    // desabilitado perde o foco, e o usuário não conseguiria
                    // digitar a próxima tarefa em sequência.
                    readOnly={criando}
                    aria-busy={criando}
                  />
                  <span id={`dica-${data}`} className={faltaTitulo ? "dica erro-campo" : "dica"}>
                    {criando
                      ? "Adicionando…"
                      : faltaTitulo
                        ? "Digite um título antes de apertar Enter"
                        : "Enter adiciona, Esc fecha"}
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
                  <IconeMais /> Adicionar
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
