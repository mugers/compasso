/** Indicador de carregamento entre páginas (três pontos menta). */
export function Carregando() {
  return (
    <div className="carregando" role="status" aria-live="polite">
      <span className="carregando-ponto" aria-hidden />
      <span className="carregando-ponto" aria-hidden />
      <span className="carregando-ponto" aria-hidden />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
