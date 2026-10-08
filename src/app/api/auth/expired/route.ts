import { clearSession } from "@/core/auth/session";
import { NextResponse } from "next/server";

/**
 * Propósito: Destino cuando una página detecta que el backend revocó la sesión: borra la
 * cookie (las páginas no pueden) y lleva al login con el motivo.
 */
export async function GET(request: Request) {
  await clearSession();
  /**
   * Output:
   * @returns NextResponse — Redirect a /login?motivo=sesion
   */
  return NextResponse.redirect(new URL("/login?motivo=sesion", request.url));
}
