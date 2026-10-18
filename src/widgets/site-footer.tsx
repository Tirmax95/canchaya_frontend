"use client";

import { useI18n } from "@/core/i18n/provider";
import Link from "next/link";

/**
 * Propósito: Pie de página compacto con enlaces de producto y legales.
 */
export function SiteFooter() {
  const { t } = useI18n();
  /**
   * Output:
   * @returns JSX.Element — Footer
   */
  return (
    <footer className="border-t border-white/8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-mist sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>{t("footer.tagline")}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/establecimientos" className="hover:text-bone">
            {t("footer.venues")}
          </Link>
          <Link href="/canchas" className="hover:text-bone">
            {t("footer.courts")}
          </Link>
          <Link href="/reservas/nueva" className="hover:text-bone">
            {t("footer.book")}
          </Link>
          <Link href="/terminos" className="hover:text-bone">
            {t("footer.terms")}
          </Link>
          <Link href="/privacidad" className="hover:text-bone">
            {t("footer.privacy")}
          </Link>
          <Link href="/eliminar-cuenta" className="hover:text-bone">
            {t("footer.deleteAccount")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
