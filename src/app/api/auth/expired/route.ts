import { clearSession } from "@/core/auth/session";
import { NextResponse } from "next/server";

/**
 * Propósito: Destino cuando una página detecta que el backend revocó la sesión: borra la
 * cookie (las páginas no pueden) y lleva al login con el motivo.
 */
export async function GET(request: Request) {
  if (!isSameOriginNavigation(request)) {
    /**
     * Output:
     * @returns NextResponse — Un enlace o <img> de otro sitio no puede cerrar la sesión
     */
    return NextResponse.redirect(new URL("/", request.url));
  }
  await clearSession();
  /**
   * Output:
   * @returns NextResponse — Redirect a /login?motivo=sesion
   */
  return NextResponse.redirect(new URL("/login?motivo=sesion", request.url));
}

/**
 * Propósito: Solo una navegación propia (redirect de una página nuestra) puede llegar aquí.
 * Con `Sec-Fetch-Site` se decide por él; en navegadores que no lo envían, el `Referer`
 * debe ser del mismo origen (una `<img>` o un enlace de otro sitio lo traen distinto).
 */
function isSameOriginNavigation(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }
  const referer = request.headers.get("referer");
  if (!referer) {
    return false;
  }
  try {
    /**
     * Output:
     * @returns boolean — True si el Referer es de este mismo origen
     */
    return new URL(referer).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
