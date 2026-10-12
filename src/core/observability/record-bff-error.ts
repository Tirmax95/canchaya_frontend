import { requestBackend } from "@/core/http/backend-client";
import type { AppError } from "@/core/errors/app-error";
import { getSession } from "@/core/auth/session";

/**
 * Propósito: Manda un 5xx del BFF a la bitácora del backend. Nunca lanza: un fallo al
 * registrar no debe esconder el error original ni ciclar con handleRoute.
 */
export async function recordBffError(error: AppError, fallbackMessage: string): Promise<void> {
  try {
    const session = await getSession();
    await requestBackend({
      path: "/observability/events",
      method: "POST",
      sessionId: session?.sessionId,
      body: {
        source: "bff",
        name: error.code,
        message: `${fallbackMessage}: ${error.message}`.slice(0, 500),
        pagePath: "/bff",
        correlationId: error.requestId,
      },
    });
    /**
     * Output:
     * Side effects — Evento enviado al backend
     */
  } catch {
    /**
     * Output:
     * Side effects — Se ignora; el usuario ya recibió el error
     */
  }
}
