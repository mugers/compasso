"use client";

import { useEffect, useRef } from "react";
import { IconeCheck, IconeFechar } from "./Icones";

/**
 * Delete confirmation dialog (native <dialog> modal).
 * "Keep" is the safe action and gets the initial focus: an accidental Enter
 * deletes nothing. Esc or clicking outside also keep the card.
 */
export function ConfirmarExclusao({
  titulo,
  excluindo,
  onManter,
  onExcluir,
}: {
  /** Title of the task to delete; null closes the dialog. */
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
        e.preventDefault(); // Esc: closed through state, not by the browser
        if (!excluindo) onManter();
      }}
      onClick={(e) => e.target === ref.current && !excluindo && onManter()}
    >
      <div className="modal-conteudo">
        <span className="modal-icone" aria-hidden>
          <IconeFechar />
        </span>
        <h2 id="exclusao-titulo">Delete task?</h2>
        <p id="exclusao-texto">
          <strong>{titulo}</strong> will be removed from the planner. This can't be undone.
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
            Keep
          </button>
          <button
            type="button"
            className="btn-escolha btn-excluir"
            onClick={onExcluir}
            disabled={excluindo}
            aria-busy={excluindo}
          >
            <IconeFechar />
            {excluindo ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
