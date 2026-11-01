/**
 * Date helpers working with "YYYY-MM-DD" strings (calendar dates, no time).
 * All arithmetic is done in UTC to avoid time zone / DST issues; "today" is
 * computed in the São Paulo time zone, on the server, and passed down to the
 * client — so server and browser always agree.
 */

export const MESES_CURTOS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MESES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const paraUTC = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const paraISO = (data: Date) => data.toISOString().slice(0, 10);

export function hojeISO(agora = new Date()): string {
  return agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
}

export function ehDataValida(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && paraISO(paraUTC(iso)) === iso;
}

export function somarDias(iso: string, n: number): string {
  const d = paraUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return paraISO(d);
}

/** 0 = Monday ... 6 = Sunday. */
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

/** Calendar grid days: full weeks (Mon–Sun) covering the month. */
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

/** "Oct 26" */
export const rotuloCurto = (iso: string) => `${MESES_CURTOS[mesDe(iso)]} ${diaDoMes(iso)}`;

/** "October 26" (plus the year when it differs from the reference year). */
export function rotuloLongo(iso: string, anoReferencia?: number): string {
  const base = `${MESES[mesDe(iso)]} ${diaDoMes(iso)}`;
  return anoReferencia !== undefined && anoDe(iso) !== anoReferencia ? `${base}, ${anoDe(iso)}` : base;
}

/** "October" */
export const nomeDoMes = (iso: string) => MESES[mesDe(iso)];

export const anoDoISO = anoDe;

/** Relative week title: "This week", "Next week", "In 3 weeks"... */
export function tituloDaSemana(ancora: string, hoje: string): string {
  const n = diferencaEmDias(inicioDaSemana(hoje), inicioDaSemana(ancora)) / 7;
  if (n === 0) return "This week";
  if (n === 1) return "Next week";
  if (n === -1) return "Last week";
  return n > 1 ? `In ${n} weeks` : `${-n} weeks ago`;
}
