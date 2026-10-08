import { NextResponse } from "next/server";
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
