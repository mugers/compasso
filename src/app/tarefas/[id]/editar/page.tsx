import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "@/trpc/server";
import { TarefaForm } from "@/components/TarefaForm";
import { hojeISO } from "@/lib/datas";

export const dynamic = "force-dynamic";

export default async function EditarTarefaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Loads the task on the server; if it doesn't exist, shows the 404 page.
  const tarefa = await api.tarefas.buscarPorId({ id }).catch((e) => {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") notFound();
    throw e;
  });

  return (
    <div className="pagina-form">
      <header className="topo">
        <h1>Edit task</h1>
        <Link href="/">Back to the planner</Link>
      </header>
      <TarefaForm tarefa={tarefa} hoje={hojeISO()} />
    </div>
  );
}
