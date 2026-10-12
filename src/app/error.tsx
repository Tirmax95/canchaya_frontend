"use client";

import { useI18n } from "@/core/i18n/provider";
import { reportClientError } from "@/widgets/client-error-reporter";
import { useEffect } from "react";

/**
 * Propósito: Error boundary de ruta sin filtrar stacks al usuario. El fallo sí se manda
 * a la bitácora para poder buscarlo.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    reportClientError({
      name: error.name,
      message: error.digest ? `${error.message} [${error.digest}]` : error.message,
      stack: error.stack,
      pagePath: window.location.pathname,
    });
  }, [error]);

  /**
   * Output:
   * @returns JSX.Element — Recuperación sin stack
   */
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl text-bone">{t("errors.title")}</h1>
      <p className="mt-3 text-sm text-mist">{t("errors.description")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-lime px-5 py-2 text-sm font-semibold text-ink"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
