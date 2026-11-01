import Link from "next/link";

export default function NotFound() {
  return (
    <div className="status">
      <h1>Tarefa não encontrada</h1>
      <p>Ela pode ter sido excluída.</p>
      <Link href="/" className="btn">Voltar para a lista</Link>
    </div>
  );
}
