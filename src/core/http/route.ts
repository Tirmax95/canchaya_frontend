import { NextResponse } from "next/server";
import type { BackendFile } from "@/core/http/backend-client";
import {
  AppError,
  serializeAppError,
  toAppError,
} from "@/core/errors/app-error";
import { recordBffError } from "@/core/observability/record-bff-error";

/**
 * Propósito: Envuelve un route handler para devolver JSON consistente y seguro.
 */
export async function handleRoute(
  execute: () => Promise<unknown>,
  fallbackMessage: string,
  options?: { skipErrorLog?: boolean },
): Promise<NextResponse> {
  try {
    const payload = await execute();
    /**
     * Output:
     * @returns NextResponse — JSON 200 o 204 si no hay cuerpo
     */
    if (payload === undefined) {
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    const appError = toAppError(error, fallbackMessage);
    if (appError.status >= 500 && !options?.skipErrorLog) {
      void recordBffError(appError, fallbackMessage);
    }
    /**
     * Output:
     * @returns NextResponse — JSON de error sin stack ni secretos
     */
    return NextResponse.json(serializeAppError(appError), {
      status: appError.status,
    });
  }
}

/**
 * Propósito: Parsea un id de ruta y falla rápido si no es entero positivo.
 */
export function parsePositiveIntParam(raw: string, resourceLabel: string): number {
  const parsedId = Number(raw);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    /**
     * Output:
     * @throws AppError — 400 si el id no es válido
     */
    throw new AppError("VALIDATION", `Identificador de ${resourceLabel} inválido`, 400);
  }
  /**
   * Output:
   * @returns number — Id validado
   */
  return parsedId;
}

/**
 * Propósito: Parsea JSON de Request y falla rápido si el cuerpo es inválido.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    /**
     * Output:
     * @throws AppError — 415: un formulario `text/plain` no puede colar JSON (CSRF)
     */
    throw new AppError("VALIDATION", "El cuerpo de la petición debe ser JSON", 415);
  }
  try {
    /**
     * Output:
     * @returns unknown — Cuerpo JSON
     */
    return await request.json();
  } catch {
    /**
     * Output:
     * @throws AppError — El cliente envió un cuerpo no JSON
     */
    throw new AppError("VALIDATION", "El cuerpo de la petición no es JSON", 400);
  }
}

/**
 * Propósito: Route handler que devuelve un archivo (PDF) del backend o el error en JSON.
 * Sin caché: son documentos con datos de facturación.
 */
export async function handleFileRoute(
  execute: () => Promise<BackendFile>,
  fallbackFileName: string,
  fallbackMessage: string,
  expectedContentType = "application/pdf",
): Promise<NextResponse> {
  try {
    const file = await execute();
    if (!file.contentType.toLowerCase().startsWith(expectedContentType)) {
      /**
       * Output:
       * @throws AppError — El backend devolvió otro tipo (p. ej. HTML): no se reenvía
       */
      throw new AppError("UPSTREAM", fallbackMessage, 502);
    }
    const fileName = (file.fileName ?? fallbackFileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    /**
     * Output:
     * @returns NextResponse — Archivo adjunto
     */
    return new NextResponse(file.content, {
      status: 200,
      headers: {
        "Content-Type": expectedContentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const appError = toAppError(error, fallbackMessage);
    if (appError.status >= 500) {
      void recordBffError(appError, fallbackMessage);
    }
    /**
     * Output:
     * @returns NextResponse — JSON de error
     */
    return NextResponse.json(serializeAppError(appError), { status: appError.status });
  }
}
