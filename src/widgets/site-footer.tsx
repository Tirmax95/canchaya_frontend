"use client";

import { useI18n } from "@/core/i18n/provider";
import Link from "next/link";

/**
 * Propósito: Pie de página compacto con enlaces de producto.
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
        <div className="flex gap-4">
          <Link href="/establecimientos" className="hover:text-bone">
            {t("footer.venues")}
          </Link>
          <Link href="/canchas" className="hover:text-bone">
            {t("footer.courts")}
          </Link>
          <Link href="/reservas/nueva" className="hover:text-bone">
            {t("footer.book")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
