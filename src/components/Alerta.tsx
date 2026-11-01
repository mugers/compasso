"use client";

import { useEffect, useRef } from "react";
import { IconeAlerta, IconeCheck, IconeFechar } from "./Icones";

export type Feedback = {
  tipo: "sucesso" | "erro";
  texto: string;
  /** Optional action inside the toast itself, e.g. "Undo". */
  acao?: { rotulo: string; executar: () => void };
};

/**
 * Feedback toast. Success toasts disappear on their own (4s, or 6s when
 * there is an action, to leave time to click it); errors stay until closed.
 */
export function Alerta({ feedback, onFechar }: { feedback: Feedback; onFechar: () => void }) {
  // Ref for the callback: parent re-renders don't restart the timer.
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    if (feedback.tipo !== "sucesso") return;
    const timer = setTimeout(() => fechar.current(), feedback.acao ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  return (
    <div
      className={`alerta alerta-${feedback.tipo}`}
      role={feedback.tipo === "erro" ? "alert" : "status"}
    >
      <span className="alerta-icone">
        {feedback.tipo === "erro" ? <IconeAlerta /> : <IconeCheck />}
      </span>
      <span className="alerta-texto">{feedback.texto}</span>
      {feedback.acao && (
        <button
          type="button"
          className="alerta-acao"
          onClick={() => {
            feedback.acao?.executar();
            onFechar();
          }}
        >
          {feedback.acao.rotulo}
        </button>
      )}
      <button type="button" className="icone" onClick={onFechar} aria-label="Dismiss">
        <IconeFechar />
      </button>
    </div>
  );
}
