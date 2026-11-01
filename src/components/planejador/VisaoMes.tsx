"use client";

import Link from "next/link";
import { useState, type DragEvent } from "react";
import { DIAS, DIAS_CURTOS } from "@/lib/constantes";
import { diaDoMes, gradeDoMes, mesmoMes, rotuloLongo } from "@/lib/datas";
import { IconeMais } from "../Icones";
import type { Tarefa } from "./tipos";

const VISIVEIS_POR_DIA = 3;

/**
 * Monthly calendar for planning ahead. Each day shows up to 3 tasks as
 * "chips"; dragging a chip to another day reschedules the task (to the end
 * of that day). Clicking a chip or the day number opens that week.
 */
export function VisaoMes({
  tarefas,
  ancora,
  hoje,
  onMover,
  onAbrirDia,
}: {
  tarefas: Tarefa[];
  ancora: string;
  hoje: string;
  onMover: (t: Tarefa, data: string) => void;
  /** Opens the week view for that day (focusing the task, if given). */
  onAbrirDia: (data: string, tarefaId?: string) => void;
}) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const grade = gradeDoMes(ancora);

  function aoSoltar(e: DragEvent, data: string) {
    e.preventDefault();
    const tarefa = tarefas.find((t) => t.id === arrastando);
    if (tarefa && tarefa.data !== data) onMover(tarefa, data);
    setArrastando(null);
    setAlvo(null);
  }

  return (
    <div className="mes" role="grid" aria-label="Month calendar">
      <div className="mes-cabecalho" role="row">
        {DIAS_CURTOS.map((d, i) => (
          <span key={d} role="columnheader" aria-label={DIAS[i]}>
            {d}
          </span>
        ))}
      </div>

      <div className="mes-grade">
        {grade.map((data) => {
          const doDia = tarefas.filter((t) => t.data === data);
          const extras = doDia.length - VISIVEIS_POR_DIA;
          const classes = [
            "dia",
            !mesmoMes(data, ancora) && "dia-fora",
            data === hoje && "dia-hoje",
            data < hoje && "dia-passou",
            alvo === data && "dia-alvo",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={data}
              role="gridcell"
              className={classes}
              aria-label={`${rotuloLongo(data)}, ${doDia.length} tasks`}
              onDragOver={(e) => {
                if (!arrastando) return;
                e.preventDefault();
                if (alvo !== data) setAlvo(data);
              }}
              onDrop={(e) => aoSoltar(e, data)}
            >
              <div className="dia-topo">
                <button
                  type="button"
                  className="dia-numero"
                  onClick={() => onAbrirDia(data)}
                  title="Open the week"
                >
                  {diaDoMes(data)}
                </button>
                <Link
                  href={`/tarefas/nova?data=${data}`}
                  className="dia-novo"
                  aria-label={`New task on ${rotuloLongo(data)}`}
                  title="New task on this day"
                >
                  <IconeMais />
                </Link>
              </div>

              <ul className="chips-dia">
                {doDia.slice(0, VISIVEIS_POR_DIA).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`chip-tarefa${t.id === arrastando ? " chip-arrastando" : ""}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", t.id);
                        setArrastando(t.id);
                      }}
                      onDragEnd={() => {
                        setArrastando(null);
                        setAlvo(null);
                      }}
                      onClick={() => onAbrirDia(data, t.id)}
                      title={t.titulo}
                    >
                      {t.titulo}
                    </button>
                  </li>
                ))}
              </ul>
              {extras > 0 && (
                <button type="button" className="dia-mais" onClick={() => onAbrirDia(data)}>
                  +{extras} more
                </button>
              )}
              {/* On narrow screens the chips become dots (see CSS). */}
              {doDia.length > 0 && (
                <span className="dia-pontos" aria-hidden>
                  {doDia.slice(0, 4).map((t) => (
                    <i key={t.id} />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
