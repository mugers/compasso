"use client";

import Link from "next/link";

/**
 * Tela de erro do App Router: aparece se o carregamento no servidor (SSR)
 * falhar. Substitui a página genérica do Next por uma mensagem clara e
 * uma forma de tentar de novo sem perder o contexto.
 */
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="status" role="alert">
      <h1>Não foi possível carregar</h1>
      <p>O servidor não respondeu como esperado. Seus dados não foram alterados.</p>
      <div className="form-acoes" style={{ justifyContent: "center" }}>
        <Link href="/" className="btn">
          Ir para o início
        </Link>
        <button type="button" className="btn btn-primario" onClick={reset}>
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
