import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/reservas",
  "/perfil",
  "/admin",
  "/equipos",
  "/retos",
  "/partidos/nuevo",
];
const STAFF_PREFIXES = ["/admin"];

/**
 * Propósito: Bloquea rutas privadas si no hay cookie de sesión.
 * La autorización fina (roles, IDOR) se revalida en el BFF.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isProtected) {
    /**
     * Output:
     * @returns NextResponse — Continúa sin tocar la request
     */
    return NextResponse.next();
  }

  const hasSession = request.cookies.get("canchaya.session")?.value
    || request.cookies.get(process.env.SESSION_COOKIE_NAME ?? "")?.value;

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    /**
     * Output:
     * @returns NextResponse — Redirect a login
     */
    return NextResponse.redirect(loginUrl);
  }

  if (STAFF_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    /**
     * Output:
     * @returns NextResponse — Deja pasar; requireStaff confirma roles
     */
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/reservas/:path*",
    "/perfil/:path*",
    "/admin/:path*",
    "/equipos/:path*",
    "/retos/:path*",
    "/partidos/nuevo",
  ],
};
