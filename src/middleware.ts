import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/reservas",
  "/perfil",
  "/admin",
  "/equipos",
  "/retos",
  "/partidos/nuevo",
  "/seguridad",
];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Propósito: Defensa CSRF de las mutaciones `/api`. Un navegador siempre envía
 * `Sec-Fetch-Site` u `Origin` en un POST; si vienen de otro sitio, se rechaza. Cubre el
 * login CSRF (formularios `text/plain` contra /api/auth/login), que SameSite no frena.
 */
function isCrossSiteMutation(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) {
    return false;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    /**
     * Output:
     * @returns boolean — True: la petición la originó otro sitio
     */
    return true;
  }
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set([request.nextUrl.origin]);
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
    } catch {
      // URL mal configurada: solo se acepta el origen del propio request.
    }
  }
  /**
   * Output:
   * @returns boolean — True si el Origin no es el de la web
   */
  return origin !== null && !allowedOrigins.has(origin);
}

/**
 * Propósito: Cabecera de cookie de sesión presente (la firma la valida el servidor).
 */
function hasSessionCookie(request: NextRequest): boolean {
  /**
   * Output:
   * @returns boolean — True si hay cookie de sesión
   */
  return Boolean(
    request.cookies.get("canchaya.session")?.value ||
      request.cookies.get(process.env.SESSION_COOKIE_NAME ?? "")?.value,
  );
}

/**
 * Propósito: Bloquea rutas privadas si no hay cookie de sesión.
 * La autorización fina (roles, IDOR) se revalida en el BFF.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    if (isCrossSiteMutation(request)) {
      /**
       * Output:
       * @returns NextResponse — 403 a mutaciones cross-site
       */
      return NextResponse.json(
        { message: "Origen no permitido", code: "FORBIDDEN" },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

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

  if (!hasSessionCookie(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    /**
     * Output:
     * @returns NextResponse — Redirect a login
     */
    return NextResponse.redirect(loginUrl);
  }

  /**
   * Output:
   * @returns NextResponse — Deja pasar; requireStaff/requireSession confirman roles y firma
   */
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/reservas/:path*",
    "/perfil/:path*",
    "/admin/:path*",
    "/equipos/:path*",
    "/retos/:path*",
    "/partidos/nuevo",
    "/seguridad",
  ],
};
