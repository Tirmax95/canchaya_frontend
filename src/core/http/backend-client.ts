import { headers as readRequestHeaders } from "next/headers";
import { discardExpiredSession, getSession } from "@/core/auth/session";
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

export interface BackendFile {
  content: ArrayBuffer;
  contentType: string;
  fileName: string | null;
}

/**
 * Propósito: Cliente HTTP único hacia NestJS, con timeout y errores tipados.
 * Centraliza URL, headers y parseo para evitar N clientes y fugas de detalle interno.
 */
export async function requestBackend<T>(request: BackendRequest): Promise<T> {
  /**
   * Output:
   * @returns T — Cuerpo JSON tipado del backend
   */
  return fetchBackend(request, "application/json", async (response) => {
    const payload = stripSensitiveFields(await parseJsonSafely(response));
    if (hasBackendErrorShape(payload)) {
      /**
       * Output:
       * @throws AppError — El backend a veces responde 200 con { error, status }
       */
      throw mapBackendFailure(payload.status ?? 400, payload, false);
    }
    return payload as T;
  });
}

/**
 * Propósito: Descarga un archivo (PDF) del backend con la sesión del usuario.
 */
export async function requestAuthedBackendFile(path: string): Promise<BackendFile> {
  const session = await getSession();
  /**
   * Output:
   * @returns BackendFile — Bytes, tipo y nombre sugerido
   */
  return withExpiredSessionCleanup(() =>
    fetchBackend(
      { path, sessionId: session?.sessionId },
      "application/pdf",
      async (response) => ({
        content: await response.arrayBuffer(),
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
        fileName: parseAttachmentFileName(response.headers.get("content-disposition")),
      }),
    ),
  );
}

/**
 * Propósito: Ejecuta el fetch con timeout, mapea fallos HTTP y lee el cuerpo dentro del
 * mismo plazo (un backend lento a mitad de respuesta también corta).
 */
async function fetchBackend<T>(
  request: BackendRequest,
  accept: string,
  readBody: (response: Response) => Promise<T>,
): Promise<T> {
  const { backendUrl, bffSharedSecret } = getServerEnv();
  assertSafeBackendPath(request.path);
  const clientIp = bffSharedSecret ? await resolveClientIp() : null;
  const method = request.method ?? "GET";
  const requestId = crypto.randomUUID();
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
        Accept: accept,
        "X-Request-Id": requestId,
        ...(request.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(request.sessionId ? { "X-Session-Id": request.sessionId } : {}),
        ...(clientIp && bffSharedSecret
          ? { "X-Client-Ip": clientIp, "X-Bff-Secret": bffSharedSecret }
          : {}),
      },
      body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      /**
       * Output:
       * @throws AppError — Error HTTP del backend mapeado a código de dominio
       */
      throw mapBackendFailure(
        response.status,
        await parseJsonSafely(response),
        Boolean(request.sessionId),
        requestId,
      );
    }

    /**
     * Output:
     * @returns T — Cuerpo leído por el llamador
     */
    return await readBody(response);
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
        undefined,
        requestId,
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
      undefined,
      requestId,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Propósito: IP del navegador para que el backend aplique rate limit por usuario real y no
 * por la IP del BFF. Solo se lee la cabecera que pone el proxy de confianza
 * (`CLIENT_IP_HEADER`, p. ej. `x-real-ip`); sin esa variable no se reenvía nada, porque
 * cualquier cliente podría inventarla.
 */
async function resolveClientIp(): Promise<string | null> {
  const headerName = process.env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (!headerName) {
    return null;
  }
  try {
    const raw = (await readRequestHeaders()).get(headerName) ?? "";
    // En X-Forwarded-For el último hop es el que añadió nuestro proxy; los anteriores
    // los controla el cliente.
    const candidate = raw.split(",").at(-1)?.trim() ?? "";
    /**
     * Output:
     * @returns string | null — IP con forma válida o null
     */
    return /^[0-9a-fA-F:.]{2,45}$/.test(candidate) ? candidate : null;
  } catch {
    /**
     * Output:
     * @returns null — Fuera de un request (build, tareas en segundo plano)
     */
    return null;
  }
}

/**
 * Propósito: Impide que un id mal validado reescriba la ruta hacia otro endpoint del backend
 * (`../`, `%2e%2e`, `#`, `\\` o caracteres de control). Defensa en profundidad: los route
 * handlers ya validan los ids con Zod o `parsePositiveIntParam`.
 */
function assertSafeBackendPath(path: string): void {
  const [pathname] = path.split("?", 1);
  const isUnsafe =
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    /[\u0000-\u001F\u007F\\#]/.test(path) ||
    pathname.split("/").some((segment) => /^(\.|%2e){1,2}$/i.test(segment));
  if (isUnsafe) {
    /**
     * Output:
     * @throws AppError — Ruta de backend manipulada
     */
    throw new AppError("VALIDATION", "Solicitud inválida", 400);
  }
}

/**
 * Propósito: Nombre de archivo de un `Content-Disposition: attachment; filename="..."`.
 */
function parseAttachmentFileName(contentDisposition: string | null): string | null {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  /**
   * Output:
   * @returns string | null — Nombre o null si no viene
   */
  return match?.[1] ?? null;
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
     * @returns null — Texto no-JSON (página de error de un proxy, stack): no se reenvía
     */
    return null;
  }
}

/** Campos que nunca deben salir del servidor, aunque el backend los incluyera por error. */
const SENSITIVE_KEYS = new Set([
  "passwordhash",
  "password_hash",
  "password",
  "totpsecret",
  "totp_secret",
  "tokenhash",
  "token_hash",
  "backupcodes",
  "backup_codes",
  "credentials",
]);

/**
 * Propósito: Elimina en profundidad los campos sensibles de una respuesta del backend. Así
 * la regla "data/ elimina passwordHash" se cumple en un solo punto para todos los endpoints.
 */
function stripSensitiveFields(value: unknown, depth = 0): unknown {
  if (depth > 20 || value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitiveFields(item, depth + 1));
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleaned[key] = stripSensitiveFields(entry, depth + 1);
    }
  }
  /**
   * Output:
   * @returns unknown — Mismo valor sin campos sensibles
   */
  return cleaned;
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
 * Propósito: Mapea status/payload del backend a AppError sin filtrar stacks. Un 401 con
 * sesión enviada significa que el backend la revocó (bloqueo, expiración, logout remoto).
 */
function mapBackendFailure(
  status: number,
  payload: unknown,
  wasSessionSent: boolean,
  requestId?: string,
): AppError {
  // Un 5xx puede traer detalles internos: el usuario solo ve el mensaje genérico.
  const message =
    status >= 500 ? "No se pudo completar la operación" : extractPublicMessage(payload).slice(0, 300);
  const code =
    status === 401
      ? wasSessionSent
        ? "SESSION_EXPIRED"
        : "UNAUTHORIZED"
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

  const payloadRequestId =
    payload && typeof payload === "object" && "requestId" in payload
      ? String((payload as { requestId?: unknown }).requestId ?? "")
      : "";
  /**
   * Output:
   * @returns AppError — Error listo para serializar al cliente
   */
  return new AppError(
    code,
    message,
    status || 502,
    undefined,
    payloadRequestId || requestId,
  );
}

/**
 * Propósito: Extrae un mensaje público y corto del payload del backend.
 * En las HttpException de Nest (`statusCode` presente) `error` es solo la frase HTTP
 * ("Bad Request") y el motivo real viene en `message` (string o lista del ValidationPipe).
 */
function extractPublicMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as { message?: unknown; error?: unknown; statusCode?: unknown };
    const nestMessage = Array.isArray(record.message) ? record.message[0] : record.message;
    if (typeof record.statusCode === "number" && typeof nestMessage === "string" && nestMessage.trim()) {
      return nestMessage;
    }
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
  return withExpiredSessionCleanup(() =>
    requestBackend<T>({
      ...request,
      sessionId: session?.sessionId,
    }),
  );
}

/**
 * Propósito: Si el backend revocó la sesión, borra la cookie local (o redirige a la ruta
 * que la borra cuando se está renderizando una página) y propaga el 401.
 */
async function withExpiredSessionCleanup<T>(execute: () => Promise<T>): Promise<T> {
  try {
    /**
     * Output:
     * @returns T — Resultado de la llamada
     */
    return await execute();
  } catch (error) {
    if (error instanceof AppError && error.code === "SESSION_EXPIRED") {
      await discardExpiredSession();
    }
    /**
     * Output:
     * @throws AppError — Error original
     */
    throw error;
  }
}
