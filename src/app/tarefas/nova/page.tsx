import Link from "next/link";
import { TarefaForm } from "@/components/TarefaForm";
import { ehDataValida, hojeISO } from "@/lib/datas";

export default async function NovaTarefaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  // ?data=AAAA-MM-DD vem do "+" do calendário ou do período que estava aberto.
  const { data } = await searchParams;
  const hoje = hojeISO();

  return (
    <div className="pagina-form">
      <header className="topo">
        <h1>Nova tarefa</h1>
        <Link href="/">Voltar ao planejador</Link>
      </header>
      <TarefaForm hoje={hoje} dataInicial={data && ehDataValida(data) ? data : hoje} />
    </div>
  );
}
