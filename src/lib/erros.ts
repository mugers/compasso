/**
 * Traduz um erro vindo do tRPC numa mensagem para o usuário.
 *
 * - Erros tratados pelo servidor (NOT_FOUND, BAD_REQUEST...) já chegam com
 *   mensagem legível em português (ver errorFormatter em server/trpc.ts).
 * - Erro inesperado (500) pode carregar detalhes internos: não exibimos.
 * - Sem `data.code` a requisição nem chegou a uma resposta do tRPC:
 *   servidor fora do ar, sem internet etc. ("Failed to fetch").
 */
export function mensagemDeErro(erro: unknown): string {
  const e = erro as { message?: string; data?: { code?: string } | null } | undefined;
  const codigo = e?.data?.code;
  if (!codigo) return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
  if (codigo === "INTERNAL_SERVER_ERROR") return "Erro inesperado no servidor. Tente de novo em instantes.";
  return e?.message || "Algo deu errado. Tente de novo.";
}
