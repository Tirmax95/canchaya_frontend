import { NextResponse } from "next/server";
import type { BackendFile } from "@/core/http/backend-client";
import {
  AppError,
  serializeAppError,
  toAppError,
} from "@/core/errors/app-error";

/**
 * Propósito: Envuelve un route handler para devolver JSON consistente y seguro.
 */
export async function handleRoute(
  execute: () => Promise<unknown>,
  fallbackMessage: string,
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
): Promise<NextResponse> {
  try {
    const file = await execute();
    const fileName = (file.fileName ?? fallbackFileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    /**
     * Output:
     * @returns NextResponse — Archivo adjunto
     */
    return new NextResponse(file.content, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const appError = toAppError(error, fallbackMessage);
    /**
     * Output:
     * @returns NextResponse — JSON de error
     */
    return NextResponse.json(serializeAppError(appError), { status: appError.status });
  }
}
