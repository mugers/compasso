/**
 * Utilitários de data trabalhando com strings "AAAA-MM-DD" (data civil, sem
 * hora). Toda a aritmética é feita em UTC para não sofrer com fuso/horário de
 * verão; "hoje" é calculado no fuso de São Paulo, no servidor, e repassado ao
 * cliente — assim servidor e navegador sempre concordam.
 */

export const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const paraUTC = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const paraISO = (data: Date) => data.toISOString().slice(0, 10);

export function hojeISO(agora = new Date()): string {
  return agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
}

export function ehDataValida(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && paraISO(paraUTC(iso)) === iso;
}

export function somarDias(iso: string, n: number): string {
  const d = paraUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return paraISO(d);
}

/** 0 = segunda ... 6 = domingo. */
export function diaDaSemana(iso: string): number {
  return (paraUTC(iso).getUTCDay() + 6) % 7;
}

export function inicioDaSemana(iso: string): string {
  return somarDias(iso, -diaDaSemana(iso));
}

export function diasDaSemana(iso: string): string[] {
  const inicio = inicioDaSemana(iso);
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

export function inicioDoMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function somarMeses(iso: string, n: number): string {
  const d = paraUTC(inicioDoMes(iso));
  return paraISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

/** Dias da grade do calendário: semanas completas (seg–dom) que cobrem o mês. */
export function gradeDoMes(iso: string): string[] {
  const primeiro = inicioDoMes(iso);
  const ultimo = somarDias(somarMeses(iso, 1), -1);
  const inicio = inicioDaSemana(primeiro);
  const fim = somarDias(inicioDaSemana(ultimo), 6);
  const total = diferencaEmDias(inicio, fim) + 1;
  return Array.from({ length: total }, (_, i) => somarDias(inicio, i));
}

export function diferencaEmDias(de: string, ate: string): number {
  return Math.round((paraUTC(ate).getTime() - paraUTC(de).getTime()) / 86_400_000);
}

export const mesmoMes = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);
export const diaDoMes = (iso: string) => Number(iso.slice(8, 10));
const mesDe = (iso: string) => Number(iso.slice(5, 7)) - 1;
const anoDe = (iso: string) => Number(iso.slice(0, 4));

/** "26 out" */
export const rotuloCurto = (iso: string) => `${diaDoMes(iso)} ${MESES_CURTOS[mesDe(iso)]}`;

/** "26 de outubro" (com o ano quando diferente do de referência). */
export function rotuloLongo(iso: string, anoReferencia?: number): string {
  const base = `${diaDoMes(iso)} de ${MESES[mesDe(iso)]}`;
  return anoReferencia !== undefined && anoDe(iso) !== anoReferencia ? `${base} de ${anoDe(iso)}` : base;
}

/** "Outubro" */
export const nomeDoMes = (iso: string) => {
  const nome = MESES[mesDe(iso)];
  return nome[0].toUpperCase() + nome.slice(1);
};

export const anoDoISO = anoDe;

/** Título relativo da semana: "Esta semana", "Próxima semana", "Daqui a 3 semanas"... */
export function tituloDaSemana(ancora: string, hoje: string): string {
  const n = diferencaEmDias(inicioDaSemana(hoje), inicioDaSemana(ancora)) / 7;
  if (n === 0) return "Esta semana";
  if (n === 1) return "Próxima semana";
  if (n === -1) return "Semana passada";
  return n > 1 ? `Daqui a ${n} semanas` : `Há ${-n} semanas`;
}
