"use client";

import { useEffect, useRef } from "react";
import { IconeAlerta, IconeCheck, IconeFechar } from "./Icones";

export type Feedback = {
  tipo: "sucesso" | "erro";
  texto: string;
  /** Ação opcional no próprio aviso, ex.: "Desfazer". */
  acao?: { rotulo: string; executar: () => void };
};

/**
 * Toast de feedback. Sucessos somem sozinhos (4s, ou 6s quando há uma ação
 * para dar tempo de clicar); erros ficam até o usuário fechar.
 */
export function Alerta({ feedback, onFechar }: { feedback: Feedback; onFechar: () => void }) {
  // Ref para o callback: assim re-renders do pai não reiniciam o timer.
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
      <button type="button" className="icone" onClick={onFechar} aria-label="Fechar aviso">
        <IconeFechar />
      </button>
    </div>
  );
}
