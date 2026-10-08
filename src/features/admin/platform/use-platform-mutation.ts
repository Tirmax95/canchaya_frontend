"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Ejecuta una mutación del panel vía BFF con estado de carga por acción y error,
 * y refresca los datos del servidor al terminar. Único punto de fetch para el super admin.
 */
export function usePlatformMutation() {
  const router = useRouter();
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Propósito: Envía JSON y devuelve el cuerpo; null si falló (el error queda en estado).
   */
  async function runMutation<TResponse>(
    actionKey: string,
    url: string,
    method: "POST" | "PUT" | "DELETE",
    body?: unknown,
  ): Promise<TResponse | null> {
    setPendingActionKey(actionKey);
    setErrorMessage(null);
    try {
      const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as TResponse & { message?: string };
      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudo completar la acción");
        /**
         * Output:
         * @returns null — Error visible en `errorMessage`
         */
        return null;
      }
      router.refresh();
      /**
       * Output:
       * @returns TResponse — Respuesta del BFF
       */
      return payload;
    } catch {
      setErrorMessage("Sin conexión con el servidor");
      /**
       * Output:
       * @returns null — Error de red
       */
      return null;
    } finally {
      setPendingActionKey(null);
    }
  }

  /**
   * Output:
   * @returns object — runMutation, acción en curso y último error
   */
  return { runMutation, pendingActionKey, errorMessage, clearError: () => setErrorMessage(null) };
}
