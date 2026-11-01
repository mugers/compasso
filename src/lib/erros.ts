/**
 * Turns an error coming from tRPC into a message for the user.
 *
 * - Errors handled by the server (NOT_FOUND, BAD_REQUEST...) already arrive
 *   with a readable message (see errorFormatter in server/trpc.ts).
 * - Unexpected errors (500) may carry internal details: we do not show them.
 * - Without `data.code` the request never got a tRPC response at all:
 *   server down, no internet, etc. ("Failed to fetch").
 */
export function mensagemDeErro(erro: unknown): string {
  const e = erro as { message?: string; data?: { code?: string } | null } | undefined;
  const codigo = e?.data?.code;
  if (!codigo) return "Can't reach the server. Check your connection and try again.";
  if (codigo === "INTERNAL_SERVER_ERROR") return "Unexpected server error. Please try again in a moment.";
  return e?.message || "Something went wrong. Please try again.";
}
