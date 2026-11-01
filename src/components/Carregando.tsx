/** Loading indicator between pages (three mint dots). */
export function Carregando() {
  return (
    <div className="carregando" role="status" aria-live="polite">
      <span className="carregando-ponto" aria-hidden />
      <span className="carregando-ponto" aria-hidden />
      <span className="carregando-ponto" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
