import { getSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { RegisterForm } from "@/features/auth/register-form";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

/**
 * Propósito: Título de registro según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("auth.registerTitle") };
}

/**
 * Propósito: Alta de jugador. Redirige si ya hay sesión.
 */
export default async function RegisterPage() {
  const [{ t }, session] = await Promise.all([getTranslator(), getSession()]);
  if (session) {
    redirect("/establecimientos");
  }

  /**
   * Output:
   * @returns JSX.Element — Registro
   */
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <p className="text-xs uppercase tracking-[0.28em] text-lime">{t("auth.registerKicker")}</p>
        <h1 className="mt-4 font-display text-6xl leading-none text-bone">{t("auth.registerHeading")}</h1>
        <p className="mt-4 max-w-md text-mist">{t("auth.registerSubtitle")}</p>
      </div>
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6 sm:p-8">
        <RegisterForm />
      </div>
    </div>
  );
}
