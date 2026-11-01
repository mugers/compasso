import { Carregando } from "@/components/Carregando";

/**
 * Carregamento ao navegar de volta para o planejador.
 *
 * Fica num route group (inicio), e não na raiz do app, de propósito: um
 * loading.tsx na raiz envolveria também /tarefas/[id]/editar em Suspense, e o
 * notFound() de lá passaria a responder 200 (o status sai antes do 404).
 */
export default Carregando;
