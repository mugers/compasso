import { api } from "@/trpc/server";
import { Planejador } from "@/components/planejador/Planejador";
import { ehModo } from "@/components/planejador/tipos";
import { TAMANHO_PAGINA } from "@/lib/constantes";
import { ehDataValida, hojeISO } from "@/lib/datas";

// Data lives in memory and changes on every request: no static caching.
export const dynamic = "force-dynamic";

const MENSAGENS: Record<string, string> = {
  criada: "Task created",
  atualizada: "Changes saved",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; modo?: string; ref?: string }>;
}) {
  const { msg, modo, ref } = await searchParams;
  const hoje = hojeISO();

  // SSR: everything the first screen needs is loaded on the server (direct
  // procedure calls, no HTTP) and arrives ready in the HTML — including the
  // first page of the List view, where the infinite scroll picks up.
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
