import { getSession } from "@/core/auth/session";
import { handleRoute } from "@/core/http/route";
import { getTranslator } from "@/core/i18n/get-locale";
import { buildSideMenu } from "@/features/navigation/build-menu";

export const dynamic = "force-dynamic";

/**
 * Propósito: Menú lateral actual de la sesión. El layout raíz no se vuelve a renderizar en
 * navegaciones del cliente, así que el AppShell lo pide aquí para reflejar al instante los
 * módulos que el super admin habilite o deshabilite.
 */
export async function GET() {
  return handleRoute(async () => {
    const [session, { t }] = await Promise.all([getSession(), getTranslator()]);
    const menu =
      session && !session.twoFactorSetupRequired ? await buildSideMenu(session, t) : null;
    /**
     * Output:
     * @returns { menu } — Menú de la sesión o null sin sesión
     */
    return { menu };
  }, "No se pudo cargar el menú");
}
