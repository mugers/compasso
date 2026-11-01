"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { trpc } from "@/trpc/client";
import { DIAS } from "@/lib/constantes";
import { diaDaSemana, ehDataValida, rotuloLongo, somarDias } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/erros";
import { Alerta, type Feedback } from "./Alerta";

type Props = {
  /** When provided, the form switches to edit mode. */
  tarefa?: { id: string; titulo: string; descricao?: string; data: string };
  /** "Today" computed on the server (São Paulo time zone). */
  hoje: string;
  /** Date preselected when creating (from the calendar or the open period). */
  dataInicial?: string;
};

const LIMITE_TITULO = 100;
const LIMITE_DESCRICAO = 500;

/**
 * A single form to create and edit. Validation happens here on the client
 * (instant feedback for the user) and again on the server via Zod (the source
 * of truth — the client is never trusted on its own).
 */
export function TarefaForm({ tarefa, hoje, dataInicial }: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const editando = Boolean(tarefa);

  const [titulo, setTitulo] = useState(tarefa?.titulo ?? "");
  const [descricao, setDescricao] = useState(tarefa?.descricao ?? "");
  const [data, setData] = useState(tarefa?.data ?? dataInicial ?? hoje);
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const erroTitulo = !titulo.trim() ? "Give the task a title" : null;
  const erroData = !ehDataValida(data) ? "Pick a date" : null;

  // Most common date shortcuts; the native picker covers any other day.
  const proximaSegunda = somarDias(hoje, 7 - diaDaSemana(hoje));
  const atalhos = [
    { rotulo: "Today", valor: hoje },
    { rotulo: "Tomorrow", valor: somarDias(hoje, 1) },
    { rotulo: "Next Monday", valor: proximaSegunda },
    { rotulo: "In 1 month", valor: somarDias(hoje, 30) },
  ];

  const aoConcluir = async (msg: "criada" | "atualizada") => {
    // Invalidates the caches so the planner reflects the change on return.
    await utils.tarefas.invalidate();
    // Goes back to the List, the planner's main screen.
    router.push(`/?msg=${msg}`);
    router.refresh();
  };
  const aoFalhar = (erro: unknown) =>
    setFeedback({ tipo: "erro", texto: `Couldn't save. ${mensagemDeErro(erro)}` });

  const criar = trpc.tarefas.criar.useMutation({
    onSuccess: () => aoConcluir("criada"),
    onError: aoFalhar,
  });
  const atualizar = trpc.tarefas.atualizar.useMutation({
    onSuccess: () => aoConcluir("atualizada"),
    onError: aoFalhar,
  });
  const salvando = criar.isPending || atualizar.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTentouEnviar(true);
    setFeedback(null);
    if (erroTitulo || erroData) {
      document.getElementById(erroTitulo ? "titulo" : "data")?.focus(); // takes the user to the error
      return;
    }
    const dados = { titulo, descricao, data };
    if (tarefa) atualizar.mutate({ id: tarefa.id, ...dados });
    else criar.mutate(dados);
  }

  // The error only shows after the first submit attempt,
  // so the user isn't scolded before typing anything.
  const mostrarErroTitulo = tentouEnviar && erroTitulo;
  const mostrarErroData = tentouEnviar && erroData;

  return (
    <form className="formulario" onSubmit={onSubmit} noValidate>
      {feedback && <Alerta feedback={feedback} onFechar={() => setFeedback(null)} />}

      <div className="campo">
        <label htmlFor="titulo">Title</label>
        <input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-invalid={Boolean(mostrarErroTitulo)}
          aria-describedby="titulo-ajuda"
          maxLength={LIMITE_TITULO}
          placeholder="e.g. Review the client proposal"
          autoFocus
          disabled={salvando}
        />
        <span id="titulo-ajuda" className={mostrarErroTitulo ? "erro-campo" : "ajuda"}>
          {mostrarErroTitulo || `${titulo.length}/${LIMITE_TITULO}`}
        </span>
      </div>

      <div className="campo">
        <label htmlFor="data">When</label>
        <div className="chips" role="group" aria-label="Date shortcuts">
          {atalhos.map((a) => (
            <button
              key={a.rotulo}
              type="button"
              className={`chip-atalho${data === a.valor ? " ativo" : ""}`}
              aria-pressed={data === a.valor}
              onClick={() => setData(a.valor)}
              disabled={salvando}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
        <input
          id="data"
          type="date"
          className="campo-data"
          value={data}
          onChange={(e) => setData(e.target.value)}
          aria-invalid={Boolean(mostrarErroData)}
          aria-describedby="data-ajuda"
          disabled={salvando}
        />
        <span id="data-ajuda" className={mostrarErroData ? "erro-campo" : "ajuda ajuda-esquerda"}>
          {mostrarErroData ||
            (ehDataValida(data) &&
              `${DIAS[diaDaSemana(data)]}, ${rotuloLongo(data, Number(hoje.slice(0, 4)))}${data < hoje ? " (in the past)" : ""}`)}
        </span>
      </div>

      <div className="campo">
        <label htmlFor="descricao">
          Description <span className="opcional">(optional)</span>
        </label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={4}
          maxLength={LIMITE_DESCRICAO}
          placeholder="Details, links, next steps"
          disabled={salvando}
        />
        <span className="ajuda">
          {descricao.length}/{LIMITE_DESCRICAO}
        </span>
      </div>

      <div className="form-acoes">
        <button type="button" className="btn" onClick={() => router.push("/")} disabled={salvando}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primario" disabled={salvando} aria-busy={salvando}>
          {salvando ? "Saving…" : editando ? "Save changes" : "Create task"}
        </button>
      </div>
    </form>
  );
}
