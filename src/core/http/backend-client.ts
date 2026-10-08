import { getSession } from "@/core/auth/session";
import { getServerEnv } from "@/core/config/env";
import { AppError } from "@/core/errors/app-error";

const REQUEST_TIMEOUT_MS = 4_000;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface BackendRequest {
  path: string;
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
  sessionId?: string;
}

/**
 * Propósito: Cliente HTTP único hacia NestJS, con timeout y errores tipados.
 * Centraliza URL, headers y parseo para evitar N clientes y fugas de detalle interno.
 */
export async function requestBackend<T>(request: BackendRequest): Promise<T> {
  const { backendUrl } = getServerEnv();
  const method = request.method ?? "GET";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (request.signal) {
    request.signal.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
  }

  try {
    const response = await fetch(`${backendUrl}${request.path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(request.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(request.sessionId ? { "X-Session-Id": request.sessionId } : {}),
      },
      body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = await parseJsonSafely(response);

    if (!response.ok) {
      /**
       * Output:
       * @throws AppError — Error HTTP del backend mapeado a código de dominio
       */
      throw mapBackendFailure(response.status, payload);
    }

    if (hasBackendErrorShape(payload)) {
      /**
       * Output:
       * @throws AppError — El backend a veces responde 200 con { error, status }
       */
      throw mapBackendFailure(payload.status ?? 400, payload);
    }

    /**
     * Output:
     * @returns T — Cuerpo JSON tipado del backend
     */
    return payload as T;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      /**
       * Output:
       * @throws AppError — Timeout o abort del fetch al backend
       */
      throw new AppError(
        "UPSTREAM",
        "El servidor tardó demasiado en responder",
        504,
      );
    }

    /**
     * Output:
     * @throws AppError — El API no está disponible
     */
    throw new AppError(
      "UPSTREAM",
      "No se pudo conectar con el API de CanchaYa",
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Propósito: Lee JSON o null sin romper si el backend responde 204 / texto.
 */
async function parseJsonSafely(response: Response): Promise<unknown> {
  if (response.status === 204) {
    /**
     * Output:
     * @returns null — Sin cuerpo
     */
    return null;
  }

  const rawBody = await response.text();
  if (!rawBody) {
    return null;
  }

  try {
    /**
     * Output:
     * @returns unknown — JSON parseado
     */
    return JSON.parse(rawBody);
  } catch {
    /**
     * Output:
     * @returns object — Envuelve texto no-JSON para no perder el mensaje
     */
    return { message: rawBody };
  }
}

interface BackendErrorShape {
  error?: string;
  message?: string;
  status?: number;
}

/**
 * Propósito: Detecta el contrato de error no-HTTP usado por algunos controladores.
 */
function hasBackendErrorShape(payload: unknown): payload is BackendErrorShape {
  if (!payload || typeof payload !== "object") {
    /**
     * Output:
     * @returns boolean — False si no hay objeto
     */
    return false;
  }

  const record = payload as BackendErrorShape;
  /**
   * Output:
   * @returns boolean — True si el backend empaquetó un error de negocio
   */
  return typeof record.error === "string" && record.error.length > 0;
}

/**
 * Propósito: Mapea status/payload del backend a AppError sin filtrar stacks.
 */
function mapBackendFailure(status: number, payload: unknown): AppError {
  const message = extractPublicMessage(payload);
  const code =
    status === 401
      ? "UNAUTHORIZED"
      : status === 403
        ? "FORBIDDEN"
        : status === 404
          ? "NOT_FOUND"
          : status === 409
            ? "CONFLICT"
            : status === 429
              ? "RATE_LIMITED"
              : status >= 400 && status < 500
                ? "VALIDATION"
                : "UPSTREAM";

  /**
   * Output:
   * @returns AppError — Error listo para serializar al cliente
   */
  return new AppError(code, message, status || 502);
}

/**
 * Propósito: Extrae un mensaje público y corto del payload del backend.
 */
function extractPublicMessage(payload: unknown): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as { message?: unknown; error?: unknown };
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
  }

  /**
   * Output:
   * @returns string — Mensaje genérico si el backend no envió uno usable
   */
  return "No se pudo completar la operación";
}

/**
 * Propósito: Llama al backend reenviando la sesión httpOnly. Nunca confía en el cliente.
 */
export async function requestAuthedBackend<T>(
  request: Omit<BackendRequest, "sessionId">,
): Promise<T> {
  const session = await getSession();
  /**
   * Output:
   * @returns T — Respuesta del backend autenticada
   */
  return requestBackend<T>({
    ...request,
    sessionId: session?.sessionId,
  });
}
