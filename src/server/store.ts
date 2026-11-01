import { randomUUID } from "node:crypto";
import { hojeISO, inicioDaSemana, somarDias } from "@/lib/datas";

export type Tarefa = {
  id: string;
  titulo: string;
  descricao?: string;
  dataCriacao: Date;
  /** Dia agendado, "AAAA-MM-DD". Permite planejar semanas e meses à frente. */
  data: string;
  /** Concluídas saem do quadro e aparecem na lista de concluídas. */
  concluida: boolean;
  dataConclusao?: Date;
};

/**
 * "Banco" em memória.
 *
 * Decisão: guardamos o array em `globalThis` para que ele sobreviva ao
 * hot-reload do Next em desenvolvimento (cada recompilação reavalia os
 * módulos e, sem isso, a lista seria zerada a cada alteração de código).
 * Reiniciar o processo apaga tudo — o desafio não pede persistência.
 *
 * A ordem do array define a ordem dos cards dentro de cada dia.
 */
const globalStore = globalThis as unknown as { __tarefasV4?: Tarefa[] };

function seed(): Tarefa[] {
  // Datas relativas à segunda-feira desta semana, para o exemplo sempre
  // cair na semana atual, na próxima e no mês seguinte.
  const segunda = inicioDaSemana(hojeISO());
  const exemplos: [string, string | undefined, number, boolean?][] = [
    ["Planejar a semana", "Revisar prioridades e agenda", 0],
    ["Reunião de equipe", "Alinhamento às 10h", 0],
    ["Responder e-mails", undefined, 0],
    ["Revisar pull requests", "Projeto do cliente X", 1],
    ["Academia", undefined, 1],
    ["Escrever documentação", "README e comentários do tRPC", 2],
    ["Ligar para o banco", undefined, 2],
    ["Deploy em homologação", "Validar com o time de QA", 3],
    ["Estudar Next.js", "Server Components e cache", 3],
    ["Retrospectiva", "O que funcionou e o que não funcionou", 4],
    ["Happy hour", undefined, 4],
    ["Feira", "Frutas, verduras e café", 5],
    ["Descansar", undefined, 6],
    // Futuro: próxima semana e além
    ["Apresentar resultados do trimestre", "Slides com métricas de outubro", 8],
    ["Consulta médica", "Levar exames", 10],
    ["Renovar passaporte", undefined, 16],
    ["Aniversário da Ana", "Comprar presente antes", 24],
    // Já concluídas
    ["Enviar relatório mensal", "Versão final para a diretoria", 0, true],
    ["Agendar dentista", undefined, 1, true],
  ];
  const agora = Date.now();
  return exemplos.map(([titulo, descricao, offset, concluida = false], i) => ({
    id: randomUUID(),
    titulo,
    descricao,
    data: somarDias(segunda, offset),
    dataCriacao: new Date(agora - (exemplos.length - i) * 60_000),
    concluida,
    dataConclusao: concluida ? new Date(agora - (exemplos.length - i) * 30_000) : undefined,
  }));
}

export const tarefas: Tarefa[] = (globalStore.__tarefasV4 ??= seed());

export function novoId() {
  return randomUUID();
}
