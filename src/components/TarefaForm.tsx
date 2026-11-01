"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { trpc } from "@/trpc/client";
import { DIAS } from "@/lib/constantes";
import { diaDaSemana, ehDataValida, rotuloLongo, somarDias } from "@/lib/datas";
import { mensagemDeErro } from "@/lib/erros";
import { Alerta, type Feedback } from "./Alerta";

type Props = {
  /** Quando informado, o formulário entra em modo de edição. */
  tarefa?: { id: string; titulo: string; descricao?: string; data: string };
  /** "Hoje" calculado no servidor (fuso de São Paulo). */
  hoje: string;
  /** Data pré-selecionada ao criar (vem do calendário ou do período aberto). */
  dataInicial?: string;
};

const LIMITE_TITULO = 100;
const LIMITE_DESCRICAO = 500;

/**
 * Formulário único para criar e editar. A validação acontece aqui no cliente
 * (resposta imediata ao usuário) e de novo no servidor via Zod (a fonte da
 * verdade — o cliente nunca é confiável sozinho).
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

  const erroTitulo = !titulo.trim() ? "Dê um título para a tarefa" : null;
  const erroData = !ehDataValida(data) ? "Escolha uma data" : null;

  // Atalhos de data mais usados; o seletor nativo cobre qualquer outro dia.
  const proximaSegunda = somarDias(hoje, 7 - diaDaSemana(hoje));
  const atalhos = [
    { rotulo: "Hoje", valor: hoje },
    { rotulo: "Amanhã", valor: somarDias(hoje, 1) },
    { rotulo: "Próxima segunda", valor: proximaSegunda },
    { rotulo: "Daqui a 1 mês", valor: somarDias(hoje, 30) },
  ];

  const aoConcluir = async (msg: "criada" | "atualizada") => {
    // Invalida os caches para o planejador refletir a mudança ao voltar.
    await utils.tarefas.invalidate();
    // Volta para a Lista, a tela principal do planejador.
    router.push(`/?msg=${msg}`);
    router.refresh();
  };
  const aoFalhar = (erro: unknown) =>
    setFeedback({ tipo: "erro", texto: `Não foi possível salvar. ${mensagemDeErro(erro)}` });

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
      document.getElementById(erroTitulo ? "titulo" : "data")?.focus(); // leva ao erro
      return;
    }
    const dados = { titulo, descricao, data };
    if (tarefa) atualizar.mutate({ id: tarefa.id, ...dados });
    else criar.mutate(dados);
  }

  // O erro só aparece após a primeira tentativa de envio,
  // para não acusar o usuário antes de ele digitar.
  const mostrarErroTitulo = tentouEnviar && erroTitulo;
  const mostrarErroData = tentouEnviar && erroData;

  return (
    <form className="formulario" onSubmit={onSubmit} noValidate>
      {feedback && <Alerta feedback={feedback} onFechar={() => setFeedback(null)} />}

      <div className="campo">
        <label htmlFor="titulo">Título</label>
        <input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-invalid={Boolean(mostrarErroTitulo)}
          aria-describedby="titulo-ajuda"
          maxLength={LIMITE_TITULO}
          placeholder="Ex.: Revisar proposta do cliente"
          autoFocus
          disabled={salvando}
        />
        <span id="titulo-ajuda" className={mostrarErroTitulo ? "erro-campo" : "ajuda"}>
          {mostrarErroTitulo || `${titulo.length}/${LIMITE_TITULO}`}
        </span>
      </div>

      <div className="campo">
        <label htmlFor="data">Quando</label>
        <div className="chips" role="group" aria-label="Atalhos de data">
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
              `${DIAS[diaDaSemana(data)]}, ${rotuloLongo(data, Number(hoje.slice(0, 4)))}${data < hoje ? " (já passou)" : ""}`)}
        </span>
      </div>

      <div className="campo">
        <label htmlFor="descricao">
          Descrição <span className="opcional">(opcional)</span>
        </label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={4}
          maxLength={LIMITE_DESCRICAO}
          placeholder="Detalhes, links, próximos passos"
          disabled={salvando}
        />
        <span className="ajuda">
          {descricao.length}/{LIMITE_DESCRICAO}
        </span>
      </div>

      <div className="form-acoes">
        <button type="button" className="btn" onClick={() => router.push("/")} disabled={salvando}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primario" disabled={salvando} aria-busy={salvando}>
          {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Criar tarefa"}
        </button>
      </div>
    </form>
  );
}
