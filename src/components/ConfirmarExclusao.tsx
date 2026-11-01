"use client";

import { useEffect, useRef } from "react";
import { IconeCheck, IconeFechar } from "./Icones";

/**
 * Tela de confirmação de exclusão (modal com <dialog> nativo).
 * "Manter" é a ação segura e recebe o foco inicial: um Enter acidental
 * não apaga nada. Esc ou clique fora também mantêm o card.
 */
export function ConfirmarExclusao({
  titulo,
  excluindo,
  onManter,
  onExcluir,
}: {
  /** Título da tarefa a excluir; null fecha a tela. */
  titulo: string | null;
  excluindo: boolean;
  onManter: () => void;
  onExcluir: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const manterRef = useRef<HTMLButtonElement>(null);
  const aberto = titulo !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto && !dialog.open) {
      dialog.showModal();
      manterRef.current?.focus();
    }
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className="modal-exclusao"
      aria-labelledby="exclusao-titulo"
      aria-describedby="exclusao-texto"
      onCancel={(e) => {
        e.preventDefault(); // Esc: fechamos pelo estado, não pelo navegador
        if (!excluindo) onManter();
      }}
      onClick={(e) => e.target === ref.current && !excluindo && onManter()}
    >
      <div className="modal-conteudo">
        <span className="modal-icone" aria-hidden>
          <IconeFechar />
        </span>
        <h2 id="exclusao-titulo">Excluir tarefa?</h2>
        <p id="exclusao-texto">
          <strong>{titulo}</strong> será removida do quadro. Essa ação não pode ser desfeita.
        </p>
        <div className="modal-acoes">
          <button
            ref={manterRef}
            type="button"
            className="btn-escolha btn-manter"
            onClick={onManter}
            disabled={excluindo}
          >
            <IconeCheck />
            Manter
          </button>
          <button
            type="button"
            className="btn-escolha btn-excluir"
            onClick={onExcluir}
            disabled={excluindo}
            aria-busy={excluindo}
          >
            <IconeFechar />
            {excluindo ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
