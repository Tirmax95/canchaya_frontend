export type AppErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UPSTREAM"
  | "UNKNOWN";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  /**
   * Propósito: Normaliza errores de dominio y de red para el BFF y la UI.
   */
  constructor(
    code: AppErrorCode,
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Propósito: Convierte un fallo desconocido en AppError sin filtrar secretos.
 */
export function toAppError(error: unknown, fallbackMessage: string): AppError {
  if (error instanceof AppError) {
    /**
     * Output:
     * @returns AppError — El mismo error de dominio ya tipado
     */
    return error;
  }

  /**
   * Output:
   * @returns AppError — Error genérico 502/500 sin stack ni payload interno
   */
  return new AppError("UNKNOWN", fallbackMessage, 500);
}

/**
 * Propósito: Serializa un AppError a JSON seguro para respuestas HTTP.
 */
export function serializeAppError(error: AppError) {
  /**
   * Output:
   * @returns object — Payload público de error
   *   - message: string — Mensaje entendible
   *   - code: AppErrorCode — Código estable para la UI
   */
  return {
    message: error.message,
    code: error.code,
  };
}
