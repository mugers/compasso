import { Carregando } from "@/components/Carregando";

/**
 * Loading state when navigating back to the planner.
 *
 * It lives in a route group (inicio), not at the app root, on purpose: a
 * root loading.tsx would also wrap /tarefas/[id]/editar in Suspense, and its
 * notFound() would then answer 200 (the status is sent before the 404).
 */
export default Carregando;
