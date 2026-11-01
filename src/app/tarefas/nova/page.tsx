import Link from "next/link";
import { TarefaForm } from "@/components/TarefaForm";
import { ehDataValida, hojeISO } from "@/lib/datas";

export default async function NovaTarefaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  // ?data=YYYY-MM-DD comes from the calendar's "+" or the period that was open.
  const { data } = await searchParams;
  const hoje = hojeISO();

  return (
    <div className="pagina-form">
      <header className="topo">
        <h1>New task</h1>
        <Link href="/">Back to the planner</Link>
      </header>
      <TarefaForm hoje={hoje} dataInicial={data && ehDataValida(data) ? data : hoje} />
    </div>
  );
}
