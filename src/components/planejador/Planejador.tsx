"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/trpc/client";
import { moverTarefa } from "@/lib/constantes";
import { mensagemDeErro } from "@/lib/erros";
import {
  anoDoISO,
  diasDaSemana,
  inicioDaSemana,
  inicioDoMes,
  mesmoMes,
  nomeDoMes,
  rotuloLongo,
  somarDias,
  somarMeses,
  tituloDaSemana,
} from "@/lib/datas";
import { Alerta, type Feedback } from "../Alerta";
import { ConfirmarExclusao } from "../ConfirmarExclusao";
import { PainelConcluidas } from "../PainelConcluidas";
import { IconeConcluidas, IconeMais, IconeSeta } from "../Icones";
import { CartaoTarefa, type PropsCartao } from "./CartaoTarefa";
import { VisaoSemana } from "./VisaoSemana";
import { VisaoMes } from "./VisaoMes";
import { VisaoLista } from "./VisaoLista";
import { MODOS, type Modo, type Saidas, type Tarefa } from "./tipos";

/**
 * Raiz do planejador: cabeçalho, troca de modo (Semana / Mês / Lista),
 * navegação entre períodos e todas as mutations. As visões só desenham e
 * avisam o que o usuário fez.
 *
 * Modo e período ficam na URL (?modo=mes&ref=2026-11-01) para que um F5 ou
 * um link compartilhado abram no mesmo lugar — e o SSR já renderize certo.
 */
export function Planejador({
  inicial,
  concluidasIniciais,
  listaInicial,
  hoje,
  modoInicial,
  ancoraInicial,
  mensagemInicial,
}: {
  inicial: Tarefa[];
  concluidasIniciais: Saidas["concluidas"];
  listaInicial: Saidas["listar"];
  hoje: string;
  modoInicial: Modo;
  ancoraInicial: string;
  mensagemInicial?: string;
}) {
  const utils = trpc.useUtils();
  const [modo, setModo] = useState<Modo>(modoInicial);
  // Data de referência do período visível (qualquer dia da semana/mês).
  const [ancora, setAncora] = useState(ancoraInicial);
  const [feedback, setFeedback] = useState<Feedback | null>(
    mensagemInicial ? { tipo: "sucesso", texto: mensagemInicial } : null,
  );
  const [paraExcluir, setParaExcluir] = useState<Tarefa | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  // Card que deve receber o foco depois de mudar de lugar/visão.
  const focarDepois = useRef<string | null>(null);

  // Mantém a URL em sincronia (sem recarregar a página).
  useEffect(() => {
    const params = new URLSearchParams({ modo });
    if (modo !== "lista") params.set("ref", ancora);
    window.history.replaceState(null, "", `/?${params}`);
  }, [modo, ancora]);

  // Em telas estreitas (carrossel), a semana atual abre já na coluna de hoje.
  useEffect(() => {
    if (modo !== "semana" || !window.matchMedia("(max-width: 1100px)").matches) return;
    const coluna = document.getElementById(`dia-${hoje}`)?.closest("section");
    const carrossel = coluna?.parentElement;
    // Rola só o carrossel, na horizontal. scrollIntoView também rolaria a
    // página na vertical (a coluna é alta) e esconderia o topo ao abrir.
    if (coluna && carrossel) carrossel.scrollLeft = coluna.offsetLeft - carrossel.offsetLeft - 16;
  }, [modo, hoje]);

  // SSR: os dados chegam prontos no HTML e viram o initialData das queries.
  const quadro = trpc.tarefas.quadro.useQuery(undefined, { initialData: inicial });
  const tarefas = quadro.data ?? [];
  const concluidas = trpc.tarefas.concluidas.useQuery(undefined, {
    initialData: concluidasIniciais,
  });

  useEffect(() => {
    if (!focarDepois.current) return;
    const el = document.querySelector<HTMLElement>(`[data-card="${focarDepois.current}"]`);
    // Ao trocar de semana, a visão muda antes de o card (otimista) chegar à
    // nova coluna: só desiste do foco depois de encontrar o card.
    if (!el) return;
    el.focus();
    focarDepois.current = null;
  }, [tarefas, modo, ancora]);

  const atualizarTudo = () =>
    Promise.all([
      utils.tarefas.quadro.invalidate(),
      utils.tarefas.concluidas.invalidate(),
      utils.tarefas.listar.invalidate(),
    ]);

  /** Aplica uma mudança otimista no cache do quadro e devolve o estado anterior. */
  async function otimista(mudar: (l: Tarefa[]) => Tarefa[]) {
    await utils.tarefas.quadro.cancel();
    const anterior = utils.tarefas.quadro.getData();
    utils.tarefas.quadro.setData(undefined, (l) => l && mudar(l));
    return { anterior };
  }
  const desfazer = (ctx?: { anterior?: Tarefa[] }) =>
    utils.tarefas.quadro.setData(undefined, ctx?.anterior);
  const erro = (prefixo: string) => (e: unknown) =>
    setFeedback({ tipo: "erro", texto: `${prefixo}. ${mensagemDeErro(e)}` });

  // ---------- Mutations ----------

  const mover = trpc.tarefas.mover.useMutation({
    onMutate: ({ id, data, posicao }) => otimista((l) => moverTarefa(l, id, data, posicao)),
    onError: (e, _v, ctx) => {
      desfazer(ctx);
      erro("Não foi possível mover a tarefa")(e);
    },
    onSettled: atualizarTudo,
  });

  const reabrir = trpc.tarefas.reabrir.useMutation({
    onMutate: async ({ id }) => {
      await utils.tarefas.concluidas.cancel();
      const anterior = utils.tarefas.concluidas.getData();
      utils.tarefas.concluidas.setData(undefined, (l) => l?.filter((t) => t.id !== id));
      return { anterior };
    },
    onSuccess: (t) => setFeedback({ tipo: "sucesso", texto: `"${t.titulo}" voltou para o planejador` }),
    onError: (e, _v, ctx) => {
      utils.tarefas.concluidas.setData(undefined, ctx?.anterior);
      erro("Não foi possível reabrir")(e);
    },
    onSettled: atualizarTudo,
  });

  // Concluir: sai da tela na hora e o aviso oferece "Desfazer".
  const concluir = trpc.tarefas.concluir.useMutation({
    onMutate: ({ id }) => otimista((l) => l.filter((t) => t.id !== id)),
    onSuccess: (t) =>
      setFeedback({
        tipo: "sucesso",
        texto: `"${t.titulo}" concluída`,
        acao: { rotulo: "Desfazer", executar: () => reabrir.mutate({ id: t.id }) },
      }),
    onError: (e, _v, ctx) => {
      desfazer(ctx);
      erro("Não foi possível concluir")(e);
    },
    onSettled: atualizarTudo,
  });

  const deletar = trpc.tarefas.deletar.useMutation({
    onSuccess: (t) => setFeedback({ tipo: "sucesso", texto: `"${t.titulo}" excluída` }),
    onError: erro("Não foi possível excluir"),
    onSettled: () => {
      setParaExcluir(null);
      return atualizarTudo();
    },
  });

  const salvarDescricao = trpc.tarefas.atualizar.useMutation({
    onMutate: ({ id, descricao }) =>
      otimista((l) =>
        l.map((t) => (t.id === id ? { ...t, descricao: descricao?.trim() || undefined } : t)),
      ),
    onSuccess: () => setFeedback({ tipo: "sucesso", texto: "Descrição salva" }),
    onError: (e, _v, ctx) => {
      desfazer(ctx);
      erro("Não foi possível salvar a descrição")(e);
    },
    onSettled: atualizarTudo,
  });

  const criar = trpc.tarefas.criar.useMutation({
    onError: erro("Não foi possível criar a tarefa"),
    onSettled: atualizarTudo,
  });

  // ---------- Ações ----------

  /** Move e, se a tarefa sair da semana visível, acompanha com a visão. */
  function moverPara(t: Tarefa, data: string, posicao?: number) {
    focarDepois.current = t.id;
    if (modo === "semana" && inicioDaSemana(data) !== inicioDaSemana(ancora)) setAncora(data);
    mover.mutate({ id: t.id, data, posicao });
  }

  function abrirDia(data: string, tarefaId?: string) {
    focarDepois.current = tarefaId ?? null;
    setAncora(data);
    setModo("semana");
  }

  function manterCard() {
    const id = paraExcluir?.id;
    setParaExcluir(null);
    if (id) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`[data-card="${id}"]`)?.focus(),
      );
    }
  }

  function navegar(direcao: -1 | 1) {
    setAncora((a) => (modo === "mes" ? somarMeses(a, direcao) : somarDias(a, 7 * direcao)));
  }

  const renderCartao = (t: Tarefa, extras: Partial<PropsCartao>) => (
    <CartaoTarefa
      tarefa={t}
      excluindo={deletar.isPending && deletar.variables?.id === t.id}
      marcadoParaExcluir={paraExcluir?.id === t.id}
      onConcluir={() => concluir.mutate({ id: t.id })}
      onExcluir={() => setParaExcluir(t)}
      onSalvarDescricao={(texto) =>
        salvarDescricao.mutate({ id: t.id, titulo: t.titulo, descricao: texto, data: t.data })
      }
      {...extras}
    />
  );

  // ---------- Títulos ----------

  const anoAtual = anoDoISO(hoje);
  const dias = diasDaSemana(ancora);
  const noPeriodoAtual =
    modo === "mes" ? mesmoMes(ancora, hoje) : inicioDaSemana(ancora) === inicioDaSemana(hoje);
  const abertasNoMes = tarefas.filter((t) => mesmoMes(t.data, ancora)).length;
  // "Nova tarefa" sugere hoje; olhando um período futuro, sugere o início dele.
  const dataSugerida =
    modo === "lista" || noPeriodoAtual ? hoje : modo === "mes" ? inicioDoMes(ancora) : dias[0];

  let titulo: React.ReactNode;
  let subtitulo: string;
  if (modo === "semana") {
    titulo = tituloDaSemana(ancora, hoje);
    subtitulo = `${rotuloLongo(dias[0])} a ${rotuloLongo(dias[6], anoAtual)}`;
  } else if (modo === "mes") {
    titulo = (
      <>
        {nomeDoMes(ancora)} <span className="titulo-ano">{anoDoISO(ancora)}</span>
      </>
    );
    subtitulo =
      abertasNoMes === 0
        ? "Nenhuma tarefa marcada neste mês"
        : `${abertasNoMes} ${abertasNoMes === 1 ? "tarefa marcada" : "tarefas marcadas"} neste mês`;
  } else {
    titulo = "Dia a dia";
    subtitulo = `${tarefas.length} tarefas em aberto, da mais próxima à mais distante`;
  }

  const totalConcluidas = concluidas.data?.length ?? 0;

  return (
    <>
      <div className="barra">
        <Link href="/" className="marca" aria-label="compasso, início">
          compasso<span className="marca-ponto" aria-hidden />
        </Link>
        <div className="topo-acoes">
          <button
            type="button"
            className="btn"
            onClick={() => setPainelAberto(true)}
            aria-haspopup="dialog"
          >
            <IconeConcluidas />
            Concluídas
            <span className="selo" aria-label={`${totalConcluidas} tarefas`}>
              {totalConcluidas}
            </span>
          </button>
          <Link href={`/tarefas/nova?data=${dataSugerida}`} className="btn btn-primario">
            <IconeMais />
            Nova tarefa
          </Link>
        </div>
      </div>

      <header className="topo">
        <div className="titulo">
          <h1>{titulo}</h1>
          <p className="subtitulo">{subtitulo}</p>
        </div>

        <div className="controles">
          {modo !== "lista" && (
            <div className="navegacao" role="group" aria-label="Navegar entre períodos">
              <button
                type="button"
                className="icone"
                onClick={() => navegar(-1)}
                aria-label={modo === "mes" ? "Mês anterior" : "Semana anterior"}
                title={modo === "mes" ? "Mês anterior" : "Semana anterior"}
              >
                <IconeSeta direcao="esquerda" />
              </button>
              <button
                type="button"
                className="btn btn-hoje"
                onClick={() => setAncora(hoje)}
                disabled={noPeriodoAtual}
              >
                Hoje
              </button>
              <button
                type="button"
                className="icone"
                onClick={() => navegar(1)}
                aria-label={modo === "mes" ? "Próximo mês" : "Próxima semana"}
                title={modo === "mes" ? "Próximo mês" : "Próxima semana"}
              >
                <IconeSeta direcao="direita" />
              </button>
            </div>
          )}

          <div className="segmentado" role="radiogroup" aria-label="Modo de exibição">
            {MODOS.map((m) => (
              <button
                key={m.valor}
                type="button"
                role="radio"
                aria-checked={modo === m.valor}
                className={modo === m.valor ? "ativo" : undefined}
                onClick={() => setModo(m.valor)}
              >
                {m.rotulo}
              </button>
            ))}
          </div>
        </div>
      </header>

      {feedback && <Alerta feedback={feedback} onFechar={() => setFeedback(null)} />}

      <PainelConcluidas
        aberto={painelAberto}
        onFechar={() => setPainelAberto(false)}
        tarefas={concluidas.data ?? []}
        carregando={concluidas.isFetching}
        reabrindoId={reabrir.isPending ? reabrir.variables?.id : undefined}
        onReabrir={(id) => reabrir.mutate({ id })}
      />

      <ConfirmarExclusao
        titulo={paraExcluir?.titulo ?? null}
        excluindo={deletar.isPending}
        onManter={manterCard}
        onExcluir={() => paraExcluir && deletar.mutate({ id: paraExcluir.id })}
      />

      {/* Descrição lida por leitores de tela ao focar qualquer card. */}
      <p id="atalhos-card" hidden>
        Digite para editar a descrição. Alt e setas movem o card. Delete exclui.
      </p>

      {modo === "semana" && (
        <VisaoSemana
          tarefas={tarefas}
          dias={dias}
          hoje={hoje}
          renderCartao={renderCartao}
          onMover={moverPara}
          onCriar={(tituloNovo, data) => criar.mutateAsync({ titulo: tituloNovo, data })}
        />
      )}
      {modo === "mes" && (
        <VisaoMes
          tarefas={tarefas}
          ancora={ancora}
          hoje={hoje}
          onMover={(t, data) => moverPara(t, data)}
          onAbrirDia={abrirDia}
        />
      )}
      {modo === "lista" && (
        <VisaoLista inicial={listaInicial} hoje={hoje} renderCartao={renderCartao} />
      )}
    </>
  );
}
