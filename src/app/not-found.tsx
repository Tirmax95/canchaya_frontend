import { getTranslator } from "@/core/i18n/get-locale";
import Link from "next/link";

/**
 * Propósito: 404 de producto, no el default de Next.
 */
export default async function NotFoundPage() {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns JSX.Element — Página 404 localizada
   */
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.28em] text-lime">{t("errors.notFoundKicker")}</p>
      <h1 className="mt-4 font-display text-5xl text-bone">{t("errors.notFoundTitle")}</h1>
      <p className="mt-3 text-mist">{t("errors.notFoundDescription")}</p>
      <Link href="/establecimientos" className="mt-6 inline-block text-lime">
        {t("errors.notFoundAction")}
      </Link>
    </div>
  );
}
