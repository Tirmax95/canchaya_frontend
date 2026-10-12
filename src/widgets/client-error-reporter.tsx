"use client";

import { useEffect } from "react";

const DEDUPE_WINDOW_MS = 10_000;
const recentReports = new Map<string, number>();

/**
 * Propósito: Envía un error del navegador al BFF. Deduplica el mismo fallo unos segundos
 * para no llenar la bitácora si un componente se rompe en bucle.
 */
export function reportClientError(input: {
  name?: string;
  message: string;
  stack?: string;
  pagePath?: string;
}): void {
  const message = input.message.trim().slice(0, 500);
  if (!message) {
    /**
     * Output:
     * Side effects — Nada: no hay mensaje
     */
    return;
  }
  const fingerprint = `${input.name ?? ""}|${message}|${input.pagePath ?? ""}`;
  const now = Date.now();
  const lastSentAt = recentReports.get(fingerprint) ?? 0;
  if (now - lastSentAt < DEDUPE_WINDOW_MS) {
    /**
     * Output:
     * Side effects — Ignora el duplicado reciente
     */
    return;
  }
  recentReports.set(fingerprint, now);

  void fetch("/api/observability/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "frontend",
      name: input.name?.slice(0, 120),
      message,
      stack: input.stack?.slice(0, 4000),
      pagePath: (input.pagePath ?? window.location.pathname).slice(0, 300),
    }),
    keepalive: true,
  }).catch(() => {
    // El reporter no debe romper la página.
  });
  /**
   * Output:
   * Side effects — POST al BFF
   */
}

/**
 * Propósito: Captura errores no controlados y promesas rechazadas de toda la app.
 */
export function ClientErrorReporter() {
  useEffect(() => {
    /**
     * Propósito: Errores de script y de recursos que llegan a window.
     */
    function handleWindowError(event: ErrorEvent) {
      if (event.filename?.startsWith("chrome-extension:")) {
        /**
         * Output:
         * Side effects — Ignora extensiones del navegador
         */
        return;
      }
      reportClientError({
        name: event.error instanceof Error ? event.error.name : "WindowError",
        message: event.message || "Error en el navegador",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        pagePath: window.location.pathname,
      });
      /**
       * Output:
       * Side effects — Error de ventana enviado
       */
    }

    /**
     * Propósito: Promesas sin catch (fetch, acciones async).
     */
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Promesa rechazada";
      reportClientError({
        name: reason instanceof Error ? reason.name : "UnhandledRejection",
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
        pagePath: window.location.pathname,
      });
      /**
       * Output:
       * Side effects — Rechazo enviado
       */
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    /**
     * Output:
     * Side effects — Listeners activos
     */
    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  /**
   * Output:
   * @returns null — No pinta UI
   */
  return null;
}
