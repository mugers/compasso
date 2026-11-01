import { api } from "@/trpc/server";
import { Planejador } from "@/components/planejador/Planejador";
import { ehModo } from "@/components/planejador/tipos";
import { TAMANHO_PAGINA } from "@/lib/constantes";
import { ehDataValida, hojeISO } from "@/lib/datas";

// Os dados vivem em memória e mudam a cada requisição: nada de cache estático.
export const dynamic = "force-dynamic";

const MENSAGENS: Record<string, string> = {
  criada: "Tarefa criada",
  atualizada: "Alterações salvas",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; modo?: string; ref?: string }>;
}) {
  const { msg, modo, ref } = await searchParams;
  const hoje = hojeISO();

  // SSR: tudo o que a primeira tela precisa é carregado no servidor (chamada
  // direta às procedures, sem HTTP) e chega pronto no HTML — inclusive a
  // primeira página do modo Lista, de onde o infinite scroll continua.
  const [tarefas, concluidas, primeiraPagina] = await Promise.all([
    api.tarefas.quadro(),
    api.tarefas.concluidas(),
    api.tarefas.listar({ limit: TAMANHO_PAGINA }),
  ]);

  return (
    <Planejador
      inicial={tarefas}
      concluidasIniciais={concluidas}
      listaInicial={primeiraPagina}
      hoje={hoje}
      modoInicial={ehModo(modo) ? modo : "lista"}
      ancoraInicial={ref && ehDataValida(ref) ? ref : hoje}
      mensagemInicial={msg ? MENSAGENS[msg] : undefined}
    />
  );
}
